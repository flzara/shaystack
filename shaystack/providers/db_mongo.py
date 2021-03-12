# -*- coding: utf-8 -*-
# SQL Provider
# See the accompanying LICENSE file.
# (C) 2021 Engie Digital
#
# vim: set ts=4 sts=4 et tw=78 sw=4 si:
# pylint: disable=line-too-long
"""
Tools to convert haystack filter to mongo request
"""
from datetime import datetime
from typing import Optional, Dict, Any, List, Union, cast

from shaystack import parse_filter, HaystackType, Quantity
from shaystack.filter_ast import FilterNode, FilterUnary, FilterPath, FilterBinary
from ..jsondumper import dump_scalar as json_dump_scalar

_simple_ops = {
    "==": "$eq",
    "!=": "$ne",
}
_logical_ops = {
    "and": "$and",
    "or": "$or",
}
_relative_ops = {
    "<": "$lt",
    "<=": "$lte",
    ">": "$gt",
    ">=": "$gte",
}


def _to_float(scalar: HaystackType) -> float:
    if isinstance(scalar, Quantity):
        return scalar.magnitude
    if isinstance(scalar, (int, float)):
        return scalar
    raise ValueError("impossible to compare with anything other than a number")


def _search_paths(node: Union[FilterNode, HaystackType], acc: List[List[str]]) -> None:
    if isinstance(node, FilterUnary):
        _search_paths(node.right, acc)
    if isinstance(node, FilterBinary):
        _search_paths(node.left, acc)
        _search_paths(node.right, acc)
    if isinstance(node, FilterPath):
        if len(node.paths) > 1:
            acc.append(node.paths)


def _join_stages(node: Union[FilterNode, HaystackType],
                 customer_id: str, version: datetime) -> List[Dict[str, Any]]:
    """
    Add a stages to replace the relation to corresponding inner document
    Args:
        node: Root filter node
        customer_id: Custimer id
        version: Version

    Returns:
        An array of stages to insert inner documents
    """
    all_paths: List[List[str]] = []
    _search_paths(node, all_paths)
    uniq_paths = sorted(set(tuple(paths) for paths in all_paths))
    aggrations_stages = []
    # 1.
    for paths in uniq_paths:
        for i in range(1, len(paths)):
            full_path = '.'.join(paths[0:i])
            aggrations_stages.extend( \
                [
                    {
                        "$lookup":
                            {
                                "from": "haystack",
                                "as": full_path,
                                "let": {f"{paths[i - 1]}_id_": f"${full_path}"},
                                "pipeline": [
                                    {
                                        "$match": {
                                            "$expr": {
                                                "$and": [
                                                    {"$eq": ["$customer_id", customer_id]},
                                                    {"$lte": ["$start_datetime", version]},
                                                    {"$gt": ["$end_datetime", version]},
                                                    {"$eq": ["$entity.id", f"$${paths[i - 1]}_id_"]},
                                                ]
                                            }
                                        }
                                    }
                                ],
                            }
                    },
                    {"$set": {full_path: {"$arrayElemAt": [f"${full_path}.entity", 0]}}},
                ])
    return aggrations_stages


def _conv_filter(node: Union[FilterNode, HaystackType]) -> Union[Dict[str, Any], str]:
    """ Convert a haystack filter to MongoDB expression """
    if isinstance(node, FilterUnary):
        if node.operator == "has":
            return {"$ne": [{"$type": f"${_conv_filter(node.right)}"}, "missing"]}
            # return {_conv_filter(node.right): {"$exists": True}}
            # return {"$cond": {"if": _conv_filter(node.right), "then": 1, "else": 0}}
        if node.operator == "not":
            if isinstance(node.right, FilterPath):
                return {"$eq": [{"$type": f"${_conv_filter(node.right)}"}, "missing"]}
            return {"$cond": {"if": _conv_filter(node.right), "then": 0, "else": 1}}
    if isinstance(node, FilterPath):
        return ".".join(node.paths)
    if isinstance(node, FilterBinary):
        if node.operator in _simple_ops:
            return {_simple_ops[node.operator]: [
                f"${_conv_filter(node.left)}",
                _conv_filter(node.right)[1:-1],
            ]}
        if node.operator in _logical_ops:
            return {_logical_ops[node.operator]: [
                _conv_filter(node.left),
                _conv_filter(node.right),
            ]}
        if node.operator in _relative_ops:
            path = _conv_filter(node.left)
            var = cast(FilterPath, node.left).paths[0]
            to_double = {
                "$let": {
                    "vars": {
                        f"{var}_regex_": {
                            "$regexFind": {
                                "input": f"${path}",
                                "regex": "n:([-+]?([0-9]*[.])?[0-9]+([eE][-+]?\\d+)?)"
                            }
                        }
                    },
                    "in": {"$toDouble": {
                        "$arrayElemAt": [f"$${var}_regex_.captures", 0]
                    }}
                }
            }

            return {_relative_ops[node.operator]: [
                to_double,
                _to_float(node.right),
            ]}
        assert 0, "Invalid operator"
        return None
    return json_dump_scalar(node)


def _mongo_filter(grid_filter: Optional[str],
                  version: datetime,
                  limit: int = 0,
                  customer_id: str = '') -> List[Dict[str, Any]]:
    assert version is not None
    if not grid_filter:
        return [
            {
                "$match":
                    {
                        "customer_id": customer_id,
                        "start_datetime": {"$lte": version},
                        "end_datetime": {"$gt": version},
                    }
            },
            {"$replaceRoot": {"newRoot": "$entity"}},
        ]
    haystack_filter = parse_filter(grid_filter)

    # 1. Init stages
    stages = [
        # First, select only documents corresponding of the versions
        {
            "$match":
                {
                    "customer_id": customer_id,
                    "start_datetime": {"$lte": version},
                    "end_datetime": {"$gt": version},
                }
        },
        # And keeps only entity
        {"$replaceRoot": {"newRoot": "$entity"}},
    ]

    # 2. Add stage for join entities
    join_stages = _join_stages(haystack_filter.head, customer_id, version)
    if join_stages:
        # Keep the original entity in _original_entity (for the last stage)
        stages.append({"$addFields": {"_original_entity": "$$ROOT"}})
        stages.extend(_join_stages(haystack_filter.head, customer_id, version))

    # 3. Add expr
    stages.append(
        {
            "$match":
                {
                    "$expr": _conv_filter(haystack_filter.head)
                }
        })

    # 4. keep only the original entity
    if join_stages:
        stages.append(
            {"$replaceRoot": {'newRoot': '$_original_entity'}},
        )

    # 5. Add limit
    if limit:
        stages.append(
            {"$limit": limit}
        )
    # pprint.PrettyPrinter(indent=2).pprint(stages)
    return stages

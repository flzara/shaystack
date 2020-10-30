"""
An Haystack API provider with a very simple implementation.
It's must be used for test.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Tuple, Any, Dict, Union, Optional, List, Set

import pytz
from overrides import overrides

from hszinc import Grid, VER_3_0, Ref, Quantity, MARKER
from .haystack_interface import HaystackInterface

log = logging.getLogger("ping.Provider")

PingGrid = Grid(
    version=VER_3_0, columns={"empty": {}}, metadata={"dis": "Ping Provider"}
)


class Provider(HaystackInterface):
    """ Simple provider to implement all Haystack operation """

    @overrides
    def values_for_tag(self, tag: str,
                       date_version: Optional[datetime]) -> Set[Any]:
        return ["value1", "value2"]

    @overrides
    def versions(self) -> List[datetime]:
        return [datetime(2020, 1, 1, tzinfo=pytz.utc).isoformat(),
                datetime(2020, 2, 1, tzinfo=pytz.utc).isoformat(),
                ]

    @overrides
    def about(self, home: str) -> Grid:  # pylint: disable=no-self-use
        """ Implement the Haystack 'about' ops """
        log.info("about()")
        grid = super().about(home)
        grid_row = grid[0]
        grid_row.update(
            {  # pylint: disable=no-member
                "productVersion": "1.0",
                "moduleName": "PingProvider",
                "moduleVersion": "1.0",
            }
        )

        return grid

    # pylint: disable=RP0801
    @overrides
    def read(
            self,
            limit: int,
            select: Optional[str],
            entity_ids: Optional[Grid] = None,
            grid_filter: Optional[str] = None,
            date_version: Optional[datetime] = None,
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.debug(
            "read(limit=%s, select='%s', ids=%s grid_filter='%s' date_version=%s)",
            limit,
            select,
            entity_ids,
            grid_filter,
            date_version,
        )
        grid = Grid(VER_3_0)
        grid.append({"id": Ref("id1"), "site": MARKER})
        return grid.extends_columns()

    @overrides
    def his_read(
            self,
            entity_id: Ref,  # pylint: disable=no-self-use, unused-argument
            dates_range: Union[Union[datetime, str], Tuple[datetime, datetime]],
            date_version: Optional[datetime],
    ) -> Grid:
        """ Return EmptyGrid """
        log.info(
            "his_read(id=%s, range=%s, date_version=%s)",
            entity_id,
            dates_range,
            date_version,
        )
        grid = Grid(VER_3_0,
                    metadata={"id": entity_id,
                              "hisStart": None,  # FIXME
                              "hisEnd": None
                              })
        grid.append({"date": datetime.now().isoformat(),  # FIXME
                     "val": Quantity(100, "°")}
                    )
        grid.append({"data": datetime.now().isoformat(),  # FIXME
                     "val": Quantity(100, "°")}
                    )
        return grid.extends_columns()

    @overrides
    def his_write(
            self, entity_id: Ref, time_serie: Grid, date_version: Optional[datetime]
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info(
            'his_write(id=%s, ts=%s, date_version=%s")',
            entity_id,
            time_serie,
            date_version,
        )
        return PingGrid

    @overrides
    def nav(self, nav_id: str) -> Any:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info('nav(nav_id="%s")', nav_id)
        return PingGrid  # FIXME

    @overrides
    def watch_sub(
            self,
            watch_dis: str,
            watch_id: Optional[str],
            ids: List[Ref],
            lease: Optional[int],
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info(
            'watch_sub(watch_dis="%s", ' 'watch_id="%s", ids=%s, lease=%s)',
            watch_dis,
            watch_id,
            ids,
            lease,
        )
        grid = Grid(VER_3_0)
        grid.append({"id": Ref("id1"), "val": Quantity(100, "°")})
        return grid.extends_columns()

    @overrides
    def watch_unsub(
            self, watch_id: str, ids: List[Ref], close: bool
    ) -> None:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info(
            'watch_unsub(watch_id="%s", ids=%s, close_all=%s)', watch_id, ids, close
        )
        return PingGrid

    @overrides
    def watch_poll(
            self, watch_id: str, refresh: bool
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info('watch_poll(watch_id="%s", refresh=%s)', watch_id, refresh)
        grid = Grid(VER_3_0)
        grid.append({"id": Ref("id1"), "val": Quantity(100, "°")})
        return grid.extends_columns()

    @overrides
    def point_write_read(
            self, entity_id: Ref, date_version: Optional[datetime]
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info('point_write_read(id=%s, date_version=%s")', entity_id, date_version)
        grid = Grid(VER_3_0)
        grid.append({"level": 1,
                     "levelDis": "a level",
                     "val": Quantity(100, "°"),
                     "who": "me"
                     })
        return grid.extends_columns()

    @overrides
    def point_write_write(self,
                          entity_id: Ref,
                          level: int,
                          val: Optional[Any],
                          duration: Quantity,
                          who: Optional[str],
                          date_version: Optional[datetime],
                          ) -> None:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info('point_write_write(id=%s, level=%s, val=%s, duration=%s, who=%s, date_version=%s")',
                 entity_id, level, val, duration, who, date_version)
        return PingGrid

    @overrides
    def invoke_action(
            self, entity_id: Ref, action: str, params: Dict[str, Any],
            date_version: Optional[datetime]
    ) -> Grid:  # pylint: disable=no-self-use
        """ Return EmptyGrid """
        log.info(
            'invoke_action(id=%s,action="%s",params=%s, date_version=%s)',
            entity_id, action, params, date_version
        )
        return PingGrid

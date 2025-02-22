import { utils, API_COLORS } from './index.js'

const formatEntityService = {
  formatIdEntity: id => {
    return id.split(' ')[0].substring(2)
  },
  isRef: entityField => {
    if (!typeof entityField === 'object') return false
    return entityField['_kind'] === 'Ref'
  },
  isNumber: string => {
    return Boolean(Number(string))
  },
  isEntityFromSource: (entitiesFromAllSource, entityId) => {
    let isEntityFromSource = false
    entitiesFromAllSource.map(entities => {
      entities.map(entity => {
        if(entity.id.val === entityId) isEntityFromSource = true
      })
    })
    return isEntityFromSource
  },
  formatEntityName: entity => {
    const id = entity.id.val
    const entityName = entity.id.dis
    return entityName ? entityName : entity.dis ? entity.dis.val : id
  },
  idToNameEntity: entitiesfromAllSource => {
    let mapEntityIdToEntityName = {}
    entitiesfromAllSource.map(entities => {
      entities.map(entity => {
        const entityId = entity.id.val
        const entityName = entity.id.dis ? entity.id.dis : (entity.dis ? entity.dis.val : entityId)
        mapEntityIdToEntityName[entityId] = entityName
      })
    })
    return mapEntityIdToEntityName
  },
  addApiSourceInformationToEntity: (entities,    apiNumber) => {
    entities.map(entity => {
      Object.keys(entity).map(key => {
        if (typeof entity[key] ==='object') entity[key]['apiSource'] = apiNumber
        else entity[key] = { val: entity[key], apiSource: apiNumber }
        return entity
      })
    })
    return entities
  },
  addApiSourceInformation: (entitiesFromAllSource) => {
    entitiesFromAllSource.slice().map((entities, index) => {
      entities.map(entity => {
        Object.keys(entity).map(key => {
          if (typeof entity[key] === 'string') {
            const newEntityKey = { val: entity[key], apiSource: index}
            entity[key] = newEntityKey
          }
        })
        return key
      })
      return entity
    })
    return entitiesFromAllSource
  },
  groupAllEntitiesById: entitiesFromAllSources => {
    let entitiesFromAllSourceCopy = utils.copyArrayOfArrayWithObject(entitiesFromAllSources)
    let initialEntities = entitiesFromAllSourceCopy.shift()
    return entitiesFromAllSourceCopy.reduce((acc, entities) => formatEntityService.groupTwoEntitiesById(acc, entities), initialEntities)
  },
  groupTwoEntitiesById: (entitiesFromFirstSource, entitiesFromSecondSource) => {
    const mergeEntities = []
    entitiesFromFirstSource.map(entityFromFirstSource => {
      const idFromSource = entityFromFirstSource.id.val
      entitiesFromSecondSource.map(entityFromSecondSource => {  // Refactor complexity
        const idFromSecondSource = entityFromSecondSource.id.val
        if (idFromSource === idFromSecondSource) {
          const keysWithSameValues = utils.findSimilarObjectsKeyWithSameValues(
            entityFromFirstSource,
            entityFromSecondSource
          )
          keysWithSameValues.map(key => {
            if(key === 'his') {
              if (typeof entityFromFirstSource[key].apiSource !== 'object') {
                const newApiSourceValue = []
                newApiSourceValue.push(entityFromFirstSource[key].apiSource)
                newApiSourceValue.push(entityFromSecondSource[key].apiSource)
                delete entityFromSecondSource[key]
                entityFromFirstSource[key].apiSource = newApiSourceValue
              }
              else {
                if (!entityFromFirstSource[key].apiSource.find(apiSource => apiSource === entityFromSecondSource[key].apiSource)) {
                  entityFromFirstSource[key].apiSource.push(entityFromSecondSource[key].apiSource)
                  delete entityFromSecondSource[key]
                }
                else delete entityFromSecondSource[key]
              }
            }
            else entityFromSecondSource[key] = entityFromFirstSource[key]
          })
          entityFromSecondSource['id'] = entityFromFirstSource['id']
          entityFromSecondSource = utils.getKeyAlreadyDuplicated(entityFromFirstSource, entityFromSecondSource)
          const keysWithDifferentValues = utils.findSimilarObjectsKeyWithDifferentsValues(
            entityFromFirstSource,
            entityFromSecondSource
          )
          keysWithDifferentValues.map(key => {
            if(key === 'id') {
              entityFromSecondSource[key] = entityFromFirstSource[key]
            }
            else {
              entityFromFirstSource = utils.renameObjectKey(entityFromFirstSource, key, `${key}_${entityFromFirstSource[key].apiSource}`)
              entityFromSecondSource = utils.renameObjectKey(entityFromSecondSource, key, `${key}_${entityFromSecondSource[key].apiSource}`)
              delete entityFromFirstSource[key]
              delete entityFromSecondSource[key]
            }
          })
          mergeEntities.push({ ...entityFromFirstSource, ...entityFromSecondSource })
          entitiesFromSecondSource = entitiesFromSecondSource.filter(entity => entity.id.val !== idFromSource)
          entitiesFromFirstSource = entitiesFromFirstSource.filter(entity => entity.id.val !== idFromSource)
        }
      })
    })
    return mergeEntities.concat(entitiesFromFirstSource.concat(entitiesFromSecondSource))
  },
  getLinkBetweenEntities: (entitiesFromAllSource) => {
    const colors = { fromSource: API_COLORS, outFromSource: '#c1e1ec' }
    const radiusNode = { fromSource: 7, outFromSource: 5 }
    const entitiesLink = []
    const entitiesNameToEntitiesId = formatEntityService.idToNameEntity(entitiesFromAllSource)
    const colorsLinkOutFromSource = []
    entitiesFromAllSource.map(entities => {
      entities.map( entity => {
        const entityId = entity.id.val
        Object.keys(entity).map(key => {
          if(typeof entity[key] !== 'boolean') {
            if(formatEntityService.isRef(entity[key]) && key !== 'id') {
              const entityIdLinked = entity[key].val
              const formatedLink = [entityId, entityIdLinked, key]
              if(!formatEntityService.isEntityFromSource(entitiesFromAllSource, entity[key].val)) {
                colorsLinkOutFromSource.push({ id: entityIdLinked, color: colors.outFromSource, marker: { radius: radiusNode.outFromSource } })
              }
              else colorsLinkOutFromSource.push({ id: entityIdLinked, color: colors.fromSource[entity.id.apiSource - 1], marker: { radius: radiusNode.fromSource } })
              entitiesLink.push(formatedLink)
            }
          }
          return key
        })
        colorsLinkOutFromSource.push({
            id: entityId, color: colors.fromSource[entity.id.apiSource - 1],
            dis: entity.id.dis ? entity.dis : entityId,
            marker: { radius:
                radiusNode.fromSource + formatEntityService.getConnectionOccurence(entityId, entitiesLink) },
            name: entitiesNameToEntitiesId[entityId]
            }
          )
      })
    })
    let colorsLinkOutFromSourceAdjusted = colorsLinkOutFromSource.map(colorLink => { return {
        id: colorLink.id,
        color: colorLink.color,
        dis: colorLink.dis,
        name: colorLink.name,
        marker: { radius: radiusNode.fromSource + formatEntityService.getConnectionOccurence(colorLink.id, entitiesLink) }}})
    return [entitiesLink, colorsLinkOutFromSourceAdjusted, entitiesNameToEntitiesId]
  },
    reajustEntitiespiSource(entities, indexApiDeleted) {
    const entitiesCopy = entities.slice()
    let entitiesReajusted = []
    entitiesCopy.map((apiEntities, index) => {
      if (index < indexApiDeleted) entitiesReajusted.push(apiEntities)
      else {
        let apiEntitiesReajusted = []
        apiEntities.map(entity => {
          const entityReajusted = {}
          Object.keys(entity).map(key => {
            entityReajusted[key] = { val: entity[key].val, apiSource: entity[key].apiSource - 1}
          })
          apiEntitiesReajusted.push(entityReajusted)
        })
        entitiesReajusted.push(apiEntitiesReajusted)
      }
    })
    return entitiesReajusted
  },
  getConnectionOccurence(entityId, entitiesLink) {
    return entitiesLink.find(entityLink => entityLink.includes(entityId)) ?
      entitiesLink.find(entityLink => entityLink.includes(entityId)).length :
      0
  },
  reajustHistoriesApiSource(histories, indexApiDeleted) {
    const historiesCopy = histories.slice()
    let historiesReajusted = []
    historiesCopy.map((apiHistories, index) => {
      if (index < indexApiDeleted) historiesReajusted.push(apiHistories)
      else {
        let apiHistoriesReajusted = {}
        Object.keys(apiHistories).map(historyId => {
          const historyEntity = []
          apiHistories[historyId].map(pointHistoryId => {
            historyEntity.push({ val: pointHistoryId.val, ts: pointHistoryId.ts, apiSource: pointHistoryId.apiSource - 1 })
          })
          apiHistoriesReajusted[historyId] = historyEntity
        })
        historiesReajusted.push(apiHistoriesReajusted)
      }
    })
    return historiesReajusted
  },
  getUniquesRelationsBetweenEntities(entitiesLink) {
    return [... new Set(entitiesLink.map(entityLink => entityLink[2]))]
  }
}

export default formatEntityService

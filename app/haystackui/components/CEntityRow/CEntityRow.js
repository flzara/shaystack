const template = `
  <v-card>
    <div class="entity-row__container">
      <h2 data-test-entity-title class="entity-row__title">{{ entityName }}</h2>
      <div class="content-container">
        <div class="entity-row__table">
          <p-his-data-table
            :isEntityData="true"
            @onRefClick="onRefClick"
            @onExternalRefClick="onExternalRefClick"
            :dataHisTable="entityTableValues"
            :dataEntity="dataEntity"
            :allEntities="allEntities"
          />
        </div>
        <div class="entity-row__chart">
          <c-chart
            data-test-history-chart
            v-if="displayChart"
            :id="chartId"
            :data="sortDataChart(dataChart)"
            :unit="unit"
            title="Historical values"
          />
          <p-his-data-table
            :isEntityData="false"
            v-if="displayHisTableData"
            @onRefClick="onRefClick"
            @onExternalRefClick="onExternalRefClick"
            :dataHisTable="hisTableValues"
            :dataEntity="dataEntity"
            :allEntities="allEntities"
          >
          </p-his-data-table>
        </div>
      </div>
    </div>
  </v-card>
`

import { formatEntityService, formatChartService, dateUtils } from '../../services/index.js'
import CChart from '../CChart/CChart.js'
import PHisDataTable from '../../presenters/PHisDataTable/PHisDataTable.js'

export default {
  template,
  name: 'CEntityRow',
  components: { CChart, PHisDataTable },
  props: {
    idEntity: {
      type: String,
      default: ''
    },
    his: {
      type: Array,
      default: () => []
    },
    dataEntity: {
      type: Object,
      default: () => {}
    },
    isFromExternalSource: {
      type: Boolean,
      default: false
    },
    isDataLoaded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      headers: [
        {
          text: 'Tag',
          align: 'start',
          sortable: false,
          value: 'tag'
        },
        { text: 'Value', value: 'value', sortable: false }
      ]
    }
  },
  computed: {
    entityTableValues() {
      return Object.keys(this.dataEntity).map(key => {
        const result = this.getEntityValue(key)
        let apiSource = null
        let tagKey = key
        const splittedKey = key.split('_')
        if (splittedKey.length > 1) {
          if (Number(splittedKey[1])) {
            // eslint-disable-next-line
            tagKey = splittedKey[0]
          }
        }
        if (key !== 'his') {
          apiSource = result.apiSource
        } else {
          apiSource = typeof result.apiSource === 'object' ? result.apiSource[0] : result.apiSource
        }
        return {
          tag: tagKey,
          value: result,
          row_class: [result._kind === 'Marker' ? `${key} haystack-marker` : key, `apiSource_${apiSource}`]
        }
      })
    },
    hisTableValues() {
      if (!this.his) return []
      return this.dataHisTable
        .map(history => {
          return history.map(row => {
            return {
              ts: row.ts.val,
              value: row,
              row_class: [`apiSource_${row.apiSource + 1}`]
            }
          })
        })
        .flatMap(history => history)
    },
    displayChart() {
      return (
        this.his.filter(his => (his ? his.length > 0 : his)).length > 0 &&
        this.isDataLoaded &&
        this.dataChart.length > 0
      )
    },
    chartId() {
      return this.isFromExternalSource ? `${this.idEntity}-external` : `${this.idEntity}-chart`
    },
    entityName() {
      return formatEntityService.formatEntityName(this.dataEntity)
    },
    dataChart() {
      return this.his
        .map((his, index) => {
          return { his, apiNumber: index }
        })
        .filter(hisData => formatChartService.isNumberTypeChart(hisData.his))
        .map(historic => {
          return { his: historic.his ? formatChartService.formatCharts(historic.his) : null, apiNumber: historic.apiNumber }
        })
    },
    dataHisTable() {
      const dataHisTable = this.his.filter(hisData => !formatChartService.isNumberTypeChart(hisData))
      if (dataHisTable.length === 1 && dataHisTable[0].length === 0) return []
      return dataHisTable
    },
    displayHisTableData() {
      return this.hisTableValues.length > 0
    },
    dataEntityKeys() {
      return Object.keys(this.dataEntity)
    },
    unit() {
      return this.dataEntity.unit ? this.dataEntity.unit.val : ''
    },
    allEntities() {
      return this.$store.getters.entities
    }
  },
  methods: {
    onRefClick(refId) {
      this.$emit('onRefClick', refId)
    },
    onExternalRefClick(refId) {
      this.$emit('onExternalRefClick', refId)
    },
    sortDataChart(dataChart) {
      return formatChartService.sortChartDataByDate(dataChart)
    },
    getEntityValue(dataEntityKey) {
      const entityKeyObject = this.dataEntity[dataEntityKey]
      const { apiSource } = this.dataEntity[dataEntityKey]
      if (!entityKeyObject.hasOwnProperty('_kind'))  return { ...entityKeyObject, apiSource }
      if (dataEntityKey==='id') entityKeyObject['dis'] = this.entityName
      return {...entityKeyObject, apiSource }
    }
  }
}


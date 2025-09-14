'format esm';
export const test_dashboards = [
  {
    fill: 'Color.white',
    tables: {
      'rick.mcgeer@engagelively.com/nightingale.sdml': {
        columns: [
          {
            name: 'month',
            type: 'number'
          },
          {
            name: 'Date',
            type: 'date'
          },
          {
            name: 'Month',
            type: 'string'
          },
          {
            name: 'Year',
            type: 'number'
          },
          {
            name: 'Army',
            type: 'number'
          },
          {
            name: 'Disease',
            type: 'number'
          },
          {
            name: 'Wounds',
            type: 'number'
          },
          {
            name: 'Other',
            type: 'number'
          },
          {
            name: 'Disease_rate',
            type: 'number'
          },
          {
            name: 'Wounds_rate',
            type: 'number'
          },
          {
            name: 'Other_rate',
            type: 'number'
          }
        ],
        connector: {
          url: 'https://galyleo-beta.engagelively.com/services/galyleo',
          remoteName: 'tables/rick.mcgeer@engagelively.com/nightingale.sdml'
        }
      },
      'rick.mcgeer@engagelively.com/records.sdml': {
        columns: [
          {
            name: 'month',
            type: 'number'
          },
          {
            name: 'cause',
            type: 'string'
          },
          {
            name: 'deaths',
            type: 'number'
          }
        ],
        connector: {
          url: 'https://galyleo-beta.engagelively.com/services/galyleo',
          remoteName: 'tables/rick.mcgeer@engagelively.com/records.sdml'
        }
      },
      'kctgalyleotest01@gmail.com/test.sdml': {
        columns: [
          {
            name: 'month',
            type: 'number'
          },
          {
            name: 'cause',
            type: 'string'
          },
          {
            name: 'deaths',
            type: 'number'
          }
        ],
        connector: {
          url: 'https://galyleo-beta.engagelively.com/services/galyleo',
          remoteName: 'tables/kctgalyleotest01@gmail.com/test.sdml'
        }
      },
      'rick/electoral_college.sdml': {
        columns: [
          {
            name: 'Year',
            type: 'number'
          },
          {
            name: 'Democratic',
            type: 'number'
          },
          {
            name: 'Republican',
            type: 'number'
          },
          {
            name: 'Other',
            type: 'number'
          }
        ],
        connector: {
          url: 'https://galyleo-beta.engagelively.com/services/galyleo',
          remoteName: 'tables/rick/electoral_college.sdml'
        }
      },
      'rick/nightingale.sdml': {
        columns: [
          {
            name: 'Month_number',
            type: 'number'
          },
          {
            name: 'Date',
            type: 'date'
          },
          {
            name: 'Month',
            type: 'string'
          },
          {
            name: 'Year',
            type: 'number'
          },
          {
            name: 'Army',
            type: 'number'
          },
          {
            name: 'Disease',
            type: 'number'
          },
          {
            name: 'Wounds',
            type: 'number'
          },
          {
            name: 'Other',
            type: 'number'
          },
          {
            name: 'Disease_rate',
            type: 'number'
          },
          {
            name: 'Wounds_rate',
            type: 'number'
          },
          {
            name: 'Other_rate',
            type: 'number'
          }
        ],
        connector: {
          url: 'https://galyleo-beta.engagelively.com/services/galyleo',
          remoteName: 'tables/rick/nightingale.sdml'
        }
      }
    },
    views: {
      Summary: {
        table: 'rick.mcgeer@engagelively.com/nightingale.sdml',
        columns: [
          'month',
          'Disease_rate',
          'Wounds_rate',
          'Other_rate'
        ],
        filterNames: [
          'MonthFilter'
        ]
      },
      MonthDetail: {
        table: 'rick.mcgeer@engagelively.com/records.sdml',
        columns: [
          'cause',
          'deaths'
        ],
        filterNames: [
          'SummaryMonth'
        ]
      }
    },
    charts: {
      SummaryMonth: {
        chartType: 'ColumnChart',
        options: {
          hAxis: {
            useFormatFromData: true,
            viewWindow: {
              max: null,
              min: null
            },
            minValue: null,
            maxValue: null
          },
          legacyScatterChartLabels: true,
          vAxes: [
            {
              useFormatFromData: true,
              viewWindow: {
                max: null,
                min: null
              },
              minValue: null,
              maxValue: null
            },
            {
              useFormatFromData: true,
              viewWindow: {
                max: null,
                min: null
              },
              minValue: null,
              maxValue: null
            }
          ],
          isStacked: false,
          booleanRole: 'certainty',
          legend: 'right',
          width: '100%',
          height: '100%',
          useFirstColumnAsDomain: true,
          title: 'Summary where 24 >= month >= 1'
        },
        viewOrTable: 'Summary',
        morphIndex: 1,
        morphicProperties: {
          rotation: 0,
          scale: 1,
          clipMode: 'visible',
          opacity: 1,
          position: {
            x: 325,
            y: 263
          },
          extent: {
            x: 596,
            y: 361
          },
          fill: 'Color.white',
          border: {
            style: {
              left: 'none',
              right: 'none',
              top: 'none',
              bottom: 'none'
            },
            width: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            },
            color: {
              top: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              left: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              right: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              bottom: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              }
            },
            radius: {
              topLeft: 0,
              topRight: 0,
              bottomRight: 0,
              bottomLeft: 0
            }
          },
          origin: {
            x: 0,
            y: 0
          }
        }
      },
      MonthDetail: {
        chartType: 'PieChart',
        options: {
          hAxis: {
            useFormatFromData: true,
            viewWindow: {
              max: null,
              min: null
            },
            minValue: null,
            maxValue: null
          },
          legacyScatterChartLabels: true,
          vAxes: [
            {
              useFormatFromData: true,
              viewWindow: {
                max: null,
                min: null
              },
              minValue: null,
              maxValue: null
            },
            {
              useFormatFromData: true,
              viewWindow: {
                max: null,
                min: null
              },
              minValue: null,
              maxValue: null
            }
          ],
          is3D: false,
          pieHole: 0,
          booleanRole: 'certainty',
          width: '100%',
          height: '100%',
          slices: {
            0: {
              color: '#ff9900'
            },
            2: {
              color: '#3366cc'
            }
          },
          title: 'deaths v cause where month = 1'
        },
        viewOrTable: 'MonthDetail',
        morphIndex: 2,
        morphicProperties: {
          rotation: 0,
          scale: 1,
          clipMode: 'visible',
          opacity: 1,
          position: {
            x: 468,
            y: 5
          },
          extent: {
            x: 374,
            y: 279
          },
          fill: 'Color.white',
          border: {
            style: {
              left: 'none',
              right: 'none',
              top: 'none',
              bottom: 'none'
            },
            width: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            },
            color: {
              top: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              left: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              right: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              },
              bottom: {
                r: 1,
                g: 1,
                b: 1,
                a: 1
              }
            },
            radius: {
              topLeft: 0,
              topRight: 0,
              bottomRight: 0,
              bottomLeft: 0
            }
          },
          origin: {
            x: 0,
            y: 0
          }
        }
      }
    },
    filters: {
      MonthFilter: {
        savedForm: {
          part: {
            moduleId: 'engageLively--galyleo-dashboard/studio/filters.cp.js',
            exportedName: 'DoubleSliderFilter',
            range: {
              start: 18184,
              end: 18606
            }
          },
          tableName: 'rick.mcgeer@engagelively.com/nightingale.sdml',
          filterType: 'Range',
          columnName: 'month',
          minVal: 1,
          maxVal: 24,
          min: 1,
          max: 24
        },
        morphIndex: 0,
        morphicProperties: {
          rotation: 0,
          scale: 1,
          clipMode: 'visible',
          opacity: 1,
          position: {
            x: 491,
            y: 632
          },
          extent: {
            x: 315,
            y: 100
          },
          fill: 'Color.white',
          border: {
            style: {
              left: 'none',
              right: 'none',
              top: 'none',
              bottom: 'none'
            },
            width: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            },
            color: {
              top: {
                r: 0.502,
                g: 0.502,
                b: 0.502,
                a: 1
              },
              left: {
                r: 0.502,
                g: 0.502,
                b: 0.502,
                a: 1
              },
              right: {
                r: 0.502,
                g: 0.502,
                b: 0.502,
                a: 1
              },
              bottom: {
                r: 0.502,
                g: 0.502,
                b: 0.502,
                a: 1
              }
            },
            radius: {
              topLeft: 10,
              topRight: 10,
              bottomRight: 10,
              bottomLeft: 10
            }
          },
          origin: {
            x: 0,
            y: 0
          }
        }
      }
    },
    morphs: [],
    numMorphs: 3
  }
];

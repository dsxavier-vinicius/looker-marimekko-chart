import * as d3 from 'd3'

/**
 * @type {import('./types/looker').VisualizationDefinition}
 */
const marimekko = {
  id: 'variable_width_area_chart',
  label: 'Variable Width Area Chart (Marimekko)',
  options: {
    bar_color: {
      type: 'string',
      label: 'Bar Color',
      display: 'color',
      default: '#4682b4'
    },
    show_labels: {
      type: 'boolean',
      label: 'Show Labels',
      default: true
    },
    show_y_axis: {
      type: 'boolean',
      label: 'Show Y Axis',
      default: true
    },
    bar_padding: {
      type: 'number',
      label: 'Bar Padding (px)',
      default: 1
    },
    font_size: {
      type: 'number',
      label: 'Label Font Size',
      default: 12
    },
    font_color: {
      type: 'string',
      label: 'Label Color',
      display: 'color',
      default: '#ffffff'
    }
  },

  create: function (element, config) {
    element.innerHTML = `
      <style>
        .mekko text {
          text-anchor: middle;
        }
        .axis path,
        .axis line {
          fill: none;
          stroke: #000;
        }
      </style>
      <svg width="100%" height="400"></svg>
    `
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    const svg = d3.select(element).select('svg')
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 50 }
    const width = element.clientWidth - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom

    const g = svg.append('g')
      .attr('class', 'mekko')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    const fields = queryResponse.fields.dimensions.concat(queryResponse.fields.measures)

    // ⚠️ Validação: precisa de 1 dimensão + 2 medidas
    if (fields.length < 3) {
      g.append('text')
        .text('⚠️ Add 1 dimension and 2 numeric measures.')
        .attr('x', 10)
        .attr('y', 20)
        .style('fill', 'red')
        .style('font-size', '14px')
      doneRendering()
      return
    }

    const parsed = data.map(d => ({
      label: d[fields[0].name]?.value ?? '',
      population: +d[fields[1].name]?.value ?? 0,
      metric: +d[fields[2].name]?.value ?? 0
    })).filter(d => !isNaN(d.population) && !isNaN(d.metric))

    if (parsed.length === 0) {
      g.append('text')
        .text('⚠️ No valid data to render chart.')
        .attr('x', 10)
        .attr('y', 20)
        .style('fill', 'red')
        .style('font-size', '14px')
      doneRendering()
      return
    }

    const totalPop = d3.sum(parsed, d => d.population)
    let cumulative = 0
    parsed.forEach(d => {
      d.x0 = cumulative
      d.width = d.population / totalPop
      cumulative += d.width
    })

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width])
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(parsed, d => d.metric)])
      .range([height, 0])

    // 🔷 Barras
    g.selectAll('rect')
      .data(parsed)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.x0))
      .attr('width', d => xScale(d.width) - config.bar_padding)
      .attr('y', d => yScale(d.metric))
      .attr('height', d => height - yScale(d.metric))
      .attr('fill', config.bar_color)

    // 🔠 Labels
    if (config.show_labels) {
      g.selectAll('text.label')
        .data(parsed)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.x0 + d.width / 2))
        .attr('y', height - 5)
        .text(d => d.label)
        .style('fill', config.font_color)
        .style('font-size', config.font_size + 'px')
    }

    // 🧭 Eixo Y
    if (config.show_y_axis) {
      g.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale))
    }

    doneRendering()
  }
}

looker.plugins.visualizations.add(marimekko)

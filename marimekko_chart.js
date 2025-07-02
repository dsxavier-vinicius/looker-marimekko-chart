// Marimekko Chart com melhorias de layout, labels e controles extras
const marimekko = {
  id: 'variable_width_area_chart',
  label: 'Variable Width Area Chart (Marimekko)',
  options: {
    bar_color: { type: 'string', label: 'Bar Color', display: 'color', default: '#4682b4' },
    show_labels: { type: 'boolean', label: 'Show Labels', default: true },
    show_values: { type: 'boolean', label: 'Show Values Inside Bars', default: false },
    show_y_axis: { type: 'boolean', label: 'Show Y Axis', default: true },
    show_x_axis: { type: 'boolean', label: 'Show X Axis', default: true },
    bar_padding: { type: 'number', label: 'Bar Padding (px)', default: 2 },
    font_size: { type: 'number', label: 'Label Font Size', default: 12 },
    font_color: { type: 'string', label: 'Label Color', display: 'color', default: '#ffffff' },
    label_rotation: { type: 'number', label: 'X-Axis Label Rotation (degrees)', default: 0 },
    max_bars: { type: 'number', label: 'Max Bars to Display', default: 50 },
    show_legend: { type: 'boolean', label: 'Show Legend', default: false },
    legend_position: { type: 'string', label: 'Legend Position', display: 'select', default: 'right', values: [ { label: 'Right', value: 'right' }, { label: 'Bottom', value: 'bottom' } ] }
  },

  create: function (element) {
    element.innerHTML = '<svg width="100%" height="460"></svg>'
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    const svg = d3.select(element).select('svg')
    svg.selectAll('*').remove()

    const width = element.clientWidth
    const height = 400
    const margin = { top: 20, right: 20, bottom: 60, left: 60 }
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom

    const fields = queryResponse.fields.dimensions.concat(queryResponse.fields.measures)
    if (fields.length < 3 || !data.length) return doneRendering()

    const labelField = fields[0].name
    const populationField = fields[1].name
    const metricField = fields[2].name

    let parsed = data.map(d => {
      const pop = parseFloat(d[populationField]?.value)
      const met = parseFloat(d[metricField]?.value)
      return {
        label: d[labelField]?.value ?? '',
        population: isNaN(pop) ? 0 : pop,
        metric: isNaN(met) ? 0 : met
      }
    }).filter(d => d.population > 0 && d.metric >= 0)

    parsed = parsed.slice(0, config.max_bars)
    const totalPop = d3.sum(parsed, d => d.population)
    if (!parsed.length || totalPop === 0) return doneRendering()

    let cumulative = 0
    parsed.forEach(d => {
      d.x0 = cumulative
      d.width = d.population / totalPop
      cumulative += d.width
    })

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, plotWidth])
    const yScale = d3.scaleLinear().domain([0, d3.max(parsed, d => d.metric)]).range([plotHeight, 0])

    g.selectAll('rect')
      .data(parsed)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.x0))
      .attr('width', d => Math.max(0, xScale(d.width) - config.bar_padding))
      .attr('y', d => yScale(d.metric))
      .attr('height', d => plotHeight - yScale(d.metric))
      .attr('fill', config.bar_color)

    if (config.show_values) {
      g.selectAll('text.value')
        .data(parsed)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', d => xScale(d.x0 + d.width / 2))
        .attr('y', d => yScale(d.metric) + 20)
        .text(d => d.metric.toFixed(2))
        .style('fill', config.font_color)
        .style('font-size', config.font_size)
        .style('text-anchor', 'middle')
    }

    if (config.show_labels) {
      g.selectAll('text.label')
        .data(parsed)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d.x0 + d.width / 2))
        .attr('y', plotHeight + 15)
        .text(d => d.label)
        .attr('transform', d => `rotate(${config.label_rotation}, ${xScale(d.x0 + d.width / 2)}, ${plotHeight + 15})`)
        .style('fill', '#333')
        .style('font-size', config.font_size)
        .style('text-anchor', 'middle')
    }

    if (config.show_y_axis) {
      g.append('g').call(d3.axisLeft(yScale))
    }
    if (config.show_x_axis) {
      const axisX = d3.axisBottom(xScale).tickValues([])
      g.append('g').attr('transform', `translate(0,${plotHeight})`).call(axisX)
    }

    if (config.show_legend) {
      const legend = svg.append('g').attr('class', 'legend')
      const xOffset = config.legend_position === 'bottom' ? 0 : width - 120
      const yOffset = config.legend_position === 'bottom' ? height : 20
      legend.append('rect')
        .attr('x', xOffset)
        .attr('y', yOffset)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', config.bar_color)
      legend.append('text')
        .attr('x', xOffset + 18)
        .attr('y', yOffset + 10)
        .text(metricField.replace(/_/g, ' '))
        .style('font-size', config.font_size)
        .style('fill', '#333')
    }

    doneRendering()
  }
}

looker.plugins.visualizations.add(marimekko)

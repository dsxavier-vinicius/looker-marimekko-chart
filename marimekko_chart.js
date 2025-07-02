// Marimekko Chart for Looker Visualization
// Com suporte completo aos controles: cor da barra, padding, fonte, labels, eixos, rotação etc.

looker.plugins.visualizations.add({
  id: 'marimekko_chart',
  label: 'Marimekko Chart (Variable Width)',
  options: {
    barColor: {
      type: 'color',
      label: 'Bar Color',
      default: '#4682b4'
    },
    barPadding: {
      type: 'number',
      label: 'Bar Padding (px)',
      default: 1
    },
    labelColor: {
      type: 'color',
      label: 'Label Color',
      default: '#ffffff'
    },
    labelFontSize: {
      type: 'number',
      label: 'Label Font Size',
      default: 12
    },
    showLabels: {
      type: 'boolean',
      label: 'Show Labels',
      default: true
    },
    showXAxis: {
      type: 'boolean',
      label: 'Show X Axis',
      default: true
    },
    showYAxis: {
      type: 'boolean',
      label: 'Show Y Axis',
      default: true
    },
    labelRotation: {
      type: 'number',
      label: 'X Axis Label Rotation (degrees)',
      default: 0
    },
    maxRows: {
      type: 'number',
      label: 'Max Rows to Display',
      default: 30
    }
  },

  create: function(element, config) {
    element.innerHTML = '<div id="chart"></div>';
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const d3 = window.d3;
    if (!d3) {
      console.error('D3 não está disponível');
      done();
      return;
    }

    if (!data || data.length === 0) {
      element.innerHTML = '<p>Nenhum dado disponível</p>';
      done();
      return;
    }

    const chartEl = d3.select(element).select('#chart');
    chartEl.selectAll('*').remove();

    const width = element.clientWidth;
    const height = element.clientHeight || 400;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const dimension = queryResponse.fields.dimensions[0];
    const measure = queryResponse.fields.measures[0];

    const maxRows = config.maxRows || 30;
    const parsedData = data.slice(0, maxRows).map(d => {
      return {
        label: d[dimension.name]?.value || '',
        value: +d[measure.name]?.value,
        width: +d[measure.name]?.value // ajustar se tiver outra measure para width
      };
    }).filter(d => !isNaN(d.value) && !isNaN(d.width));

    const totalWidth = d3.sum(parsedData, d => d.width);
    const xScale = d3.scaleLinear().domain([0, totalWidth]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, d3.max(parsedData, d => d.value)]).range([innerHeight, 0]);

    const svg = chartEl.append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    let cumulativeX = 0;
    svg.selectAll('.bar')
      .data(parsedData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => {
        const x = xScale(cumulativeX);
        cumulativeX += d.width;
        return x;
      })
      .attr('y', d => yScale(d.value))
      .attr('width', d => xScale(d.width) - config.barPadding)
      .attr('height', d => innerHeight - yScale(d.value))
      .attr('fill', config.barColor);

    if (config.showLabels) {
      cumulativeX = 0;
      svg.selectAll('.label')
        .data(parsedData)
        .enter()
        .append('text')
        .attr('x', d => {
          const x = xScale(cumulativeX) + (xScale(d.width) - config.barPadding) / 2;
          cumulativeX += d.width;
          return x;
        })
        .attr('y', d => yScale(d.value) + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', config.labelColor)
        .style('font-size', `${config.labelFontSize}px`)
        .text(d => d.label);
    }

    if (config.showXAxis) {
      const xAxis = d3.axisBottom(xScale.copy().domain([0, totalWidth]));
      svg.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .attr('text-anchor', config.labelRotation ? 'end' : 'middle')
        .attr('transform', `rotate(${config.labelRotation})`);
    }

    if (config.showYAxis) {
      const yAxis = d3.axisLeft(yScale).ticks(5);
      svg.append('g')
        .call(yAxis);
    }

    done();
  }
});

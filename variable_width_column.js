// Looker Custom Visualization: Refined Variable Width Bar Chart (Reactive & Polished + Resize + Label Fix)

let d3ready = false;

looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart_refined',
  label: 'Variable Width Bar Chart (Refined)',

  options: {
    bar_color: { type: 'string', display: 'color', label: 'Bar Color', default: '#4285F4' },
    bar_spacing: { type: 'number', label: 'Bar Spacing (px)', default: 5 },
    show_y_axis: { type: 'boolean', label: 'Show Y Axis', default: true },
    y_axis_format: { type: 'string', label: 'Y Axis Format', default: '' },
    show_labels: { type: 'boolean', label: 'Show Labels', default: true },
    label_position: {
      type: 'string', display: 'radio', label: 'Label Position',
      values: [ { 'Inside': 'inside' }, { 'Outside': 'outside' } ],
      default: 'inside'
    },
    label_rotation: { type: 'number', label: 'Label Rotation (°)', default: 270 },
    label_font_size: { type: 'number', label: 'Label Font Size', default: 12 },
    label_light_color: { type: 'string', display: 'color', label: 'Label Color on Dark Bar', default: '#FFF' },
    label_dark_color: { type: 'string', display: 'color', label: 'Label Color on Light Bar', default: '#000' }
  },

  create(element, config) {
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = () => { d3ready = true; this.trigger('update'); };
      document.head.appendChild(script);
    } else {
      d3ready = true;
    }

    element.innerHTML = `
      <style>
        .chart-container { width: 100%; height: 100%; position: relative; }
        svg { width: 100%; height: 100%; }
        .tooltip { position: absolute; background: white; border: 1px solid #CCC; padding: 8px; font-size: 12px; pointer-events: none; display: none; z-index: 10; }
        .axis line, .axis path { stroke: #CCC; }
      </style>
      <div class="chart-container">
        <svg></svg>
        <div class="tooltip"></div>
      </div>
    `;

    // Resize Observer
    this._resizeObserver = new ResizeObserver(() => {
      if (d3ready) this.trigger('update');
    });
    const container = element.querySelector('.chart-container');
    if (container) this._resizeObserver.observe(container);
  },

  destroy(element) {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      delete this._resizeObserver;
    }
  },

  updateAsync(data, element, config, queryResponse, details, doneRendering) {
    if (!d3ready) {
      setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100);
      return;
    }

    const svg = d3.select(element).select('svg');
    const tooltip = d3.select(element).select('.tooltip');
    svg.selectAll('*').remove();

    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;
    if (dims.length < 1 || meas.length < 2) return;

    const [dim, heightMeas, widthMeas] = [dims[0], meas[0], meas[1]];

    let cumulativeWidth = 0;
    const bars = data.map((row) => {
      const width = +row[widthMeas.name].value || 0;
      const height = +row[heightMeas.name].value || 0;
      const bar = {
        x: cumulativeWidth,
        width,
        height,
        label: row[dim.name].value,
        tooltip: {
          x: row[dim.name],
          y: row[heightMeas.name],
          w: row[widthMeas.name]
        }
      };
      cumulativeWidth += width;
      return bar;
    });

    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const width = element.offsetWidth - margin.left - margin.right;
    const height = element.offsetHeight - margin.top - margin.bottom;
    const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, cumulativeWidth]).range([0, width]);
    const yMax = d3.max(bars, d => d.height);
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

    if (config.show_y_axis) {
      chart.append('g').attr('class', 'axis').call(d3.axisLeft(yScale).tickFormat(d3.format(config.y_axis_format || ',')));
    }

    const spacing = +config.bar_spacing;

    chart.selectAll('rect')
      .data(bars)
      .join('rect')
      .attr('x', d => xScale(d.x) + spacing / 2)
      .attr('y', d => yScale(d.height))
      .attr('width', d => Math.max(0, xScale(d.width) - spacing))
      .attr('height', d => height - yScale(d.height))
      .attr('fill', config.bar_color)
      .on('mouseover', (e, d) => {
        tooltip.style('display', 'block')
          .html(`
            <strong>${d.tooltip.x.value}</strong><br>
            ${heightMeas.label}: ${d.tooltip.y.rendered}<br>
            ${widthMeas.label}: ${d.tooltip.w.rendered}
          `);
      })
      .on('mousemove', e => {
        tooltip.style('left', (e.pageX + 15) + 'px')
               .style('top', (e.pageY - 20) + 'px');
      })
      .on('mouseout', () => tooltip.style('display', 'none'));

    if (config.show_labels) {
      chart.selectAll('.label')
        .data(bars)
        .join('text')
        .attr('class', 'label')
        .text(d => d.tooltip.y.rendered)
        .attr('x', d => xScale(d.x + d.width / 2))
        .attr('y', d => {
          const baseY = yScale(d.height);
          if (config.label_position === 'outside') {
            return config.label_rotation !== 0 ? baseY - 5 : baseY - 10;
          } else {
            return baseY + config.label_font_size + 2;
          }
        })
        .attr('fill', () => {
          const luminance = d3.hsl(config.bar_color).l;
          return luminance > 0.6 ? config.label_dark_color : config.label_light_color;
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', config.label_font_size)
        .attr('transform', d => {
          const x = xScale(d.x + d.width / 2);
          const y = config.label_position === 'outside'
            ? yScale(d.height) - 5
            : yScale(d.height) + config.label_font_size + 2;
          return `rotate(${config.label_rotation}, ${x}, ${y})`;
        });
    }

    doneRendering();
  }
});

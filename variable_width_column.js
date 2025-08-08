looker.plugins.visualizations.add({
  id: 'variable_width_column_chart_final_v3',
  label: 'Variable Width Column Chart (Final)',
  options: {
    bar_color: {
      type: 'string',
      display: 'color',
      label: 'Bar Color',
      section: 'General',
      default: '#4285F4',
      order: 1,
    },
    bar_spacing: {
      type: 'number',
      label: 'Space Between Columns (px)',
      section: 'General',
      default: 4,
      order: 2,
    },
    show_y_axis: {
      type: 'boolean',
      label: 'Show Y-Axis',
      section: 'Axes',
      default: true,
      order: 1,
    },
    y_axis_format: {
      type: 'string',
      label: 'Y-Axis Value Format',
      section: 'Axes',
      placeholder: 'e.g., "#,##0.0"',
      default: '',
      order: 2,
    },
    show_labels: {
      type: 'boolean',
      label: 'Show Value Labels',
      section: 'Labels',
      default: true,
      order: 1,
    },
    label_rotation: {
      type: 'number',
      label: 'X-Axis Label Rotation (°)',
      section: 'Labels',
      default: 0,
      order: 2,
    },
    label_font_size: {
      type: 'number',
      label: 'Label Font Size',
      section: 'Labels',
      default: 12,
      order: 3,
    },
    label_light_color: {
      type: 'string',
      label: 'Label Color (on Dark Bars)',
      section: 'Labels',
      display: 'color',
      default: '#FFFFFF',
      order: 4,
    },
    label_dark_color: {
      type: 'string',
      label: 'Label Color (on Light Bars)',
      section: 'Labels',
      display: 'color',
      default: '#212121',
      order: 5,
    },
  },

  _d3_ready: false,
  _elements_ready: false,

  create: function (element, config) {
    const d3_version = '7';
    if (typeof d3 === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://d3js.org/d3.v${d3_version}.min.js`;
      script.async = true;
      script.onload = () => { this._d3_ready = true; };
      document.head.appendChild(script);
    } else {
      this._d3_ready = true;
    }

    element.innerHTML = `
      <style>
        .chart-container { width: 100%; height: 100%; font-family: "Google Sans", "Noto Sans", sans-serif; }
        .bar-rect:hover { opacity: 0.85; cursor: pointer; }
        .chart-axis path, .chart-axis line { fill: none; stroke: #C0C0C0; shape-rendering: crispEdges; }
        .chart-axis text, .x-axis-label { fill: #333; font-size: 12px; }
        .bar-label { pointer-events: none; }
        .custom-tooltip {
          background-color: #FFFFFF; border: 1px solid #E0E0E0;
          box-shadow: 0px 2px 4px rgba(0,0,0,0.1); border-radius: 4px;
          padding: 8px 12px; font-size: 12px; color: #333;
        }
        .tooltip-title { font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #E0E0E0; padding-bottom: 4px; }
        .tooltip-metric { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .tooltip-metric-label { color: #616161; margin-right: 16px; }
        .tooltip-metric-value { font-weight: bold; }
      </style>
      <div class="chart-container">
        <svg class="chart-svg"></svg>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, done) {
    if (!this._d3_ready) { setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, done), 100); return; }

    if (!this._elements_ready) {
      this._svg = d3.select(element).select('.chart-svg');
      this._tooltip = d3.select(element).append('div')
        .attr('class', 'looker-tooltip custom-tooltip')
        .style('display', 'none')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('z-index', 100);
      this._elements_ready = true;
    }

    this.clearErrors();
    this._svg.selectAll('*').remove();
    if (data.length === 0) { done(); return; }

    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;
    if (dims.length < 1 || meas.length < 2) {
      this.addError({ title: 'Invalid field structure', message: 'Must have 1 dimension and 2 measures' });
      return;
    }

    const xDim = dims[0], yMeas = meas[0], wMeas = meas[1];

    let accWidth = 0;
    const processed = data.map((row, i) => {
      const y = parseFloat(row[yMeas.name]?.value) || 0;
      const w = parseFloat(row[wMeas.name]?.value) || 0;
      const xStart = accWidth;
      accWidth += w;
      return {
        index: i,
        xCategory: row[xDim.name].value,
        yValue: y,
        widthValue: w,
        xStartData: xStart,
        _cells: { x: row[xDim.name], y: row[yMeas.name], width: row[wMeas.name] },
      };
    });

    const chartWidth = element.clientWidth - 60 - 20;
    const chartHeight = element.clientHeight - 20 - 50;
    const spacing = parseFloat(config.bar_spacing) || 0;
    const drawableWidth = chartWidth - (processed.length - 1) * spacing;

    const x = d3.scaleLinear().domain([0, accWidth || 1]).range([0, drawableWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(processed, d => d.yValue) || 1]).range([chartHeight, 0]).nice();

    const g = this._svg.attr('width', '100%').attr('height', '100%')
      .append('g').attr('transform', 'translate(60,20)');

    if (config.show_y_axis) {
      g.append('g').attr('class', 'chart-axis')
        .call(d3.axisLeft(y).tickFormat(d3.format(config.y_axis_format || ',')));
    }

    const xAxisGroup = g.append('g')
      .attr('class', 'chart-axis')
      .attr('transform', `translate(0,${chartHeight})`);

    g.selectAll('.bar-rect')
      .data(processed)
      .join('rect')
      .attr('class', 'bar-rect')
      .attr('x', d => x(d.xStartData) + d.index * spacing)
      .attr('y', d => y(d.yValue))
      .attr('width', d => x(d.widthValue))
      .attr('height', d => chartHeight - y(d.yValue))
      .attr('fill', config.bar_color)
      .on('mouseover', (event, d) => {
        const percent = accWidth > 0 ? (d.widthValue / accWidth * 100) : 0;
        const html = `
          <div class="tooltip-title">${LookerCharts.Utils.textForCell(d._cells.x)}</div>
          <div class="tooltip-metric"><span class="tooltip-metric-label">${yMeas.label_short}</span><span class="tooltip-metric-value">${LookerCharts.Utils.textForCell(d._cells.y)}</span></div>
          <div class="tooltip-metric"><span class="tooltip-metric-label">${wMeas.label_short}</span><span class="tooltip-metric-value">${LookerCharts.Utils.textForCell(d._cells.width)}</span></div>
          <div class="tooltip-metric"><span class="tooltip-metric-label">% Width</span><span class="tooltip-metric-value">${percent.toFixed(1)}%</span></div>
        `;
        this._tooltip.html(html).style('display', 'block');
      })
      .on('mousemove', (event) => {
        this._tooltip
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY + 15}px`);
      })
      .on('mouseout', () => {
        this._tooltip.style('display', 'none');
      })
      .on('click', (event, d) => {
        LookerCharts.Utils.openDrillMenu({ links: d._cells.x.links, event });
      });

    processed.forEach(d => {
      const barW = x(d.widthValue);
      const xPos = x(d.xStartData) + d.index * spacing;
      if (isNaN(barW) || isNaN(xPos)) return;
      const center = xPos + barW / 2;
      const label = xAxisGroup.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', center)
        .attr('y', 35)
        .attr('transform', `rotate(${config.label_rotation}, ${center}, 35)`)
        .attr('text-anchor', 'middle')
        .text(d.xCategory);

      if (label.node().getBBox().width > barW) {
        const chars = Math.floor(barW / 7);
        label.text(d.xCategory.substring(0, chars > 0 ? chars : 1) + '...');
      }
    });

    if (config.show_labels) {
      g.selectAll('.bar-label')
        .data(processed)
        .join('text')
        .attr('class', 'bar-label')
        .text(d => LookerCharts.Utils.textForCell(d._cells.y))
        .attr('font-size', `${config.label_font_size}px`)
        .attr('fill', () => {
          const lum = this.getLuminance(config.bar_color);
          return lum > 0.5 ? config.label_dark_color : config.label_light_color;
        })
        .attr('x', d => x(d.xStartData) + d.index * spacing + x(d.widthValue) / 2)
        .attr('y', d => y(d.yValue) - 5)
        .attr('text-anchor', 'middle')
        .style('display', d => {
          const h = chartHeight - y(d.yValue);
          return h < config.label_font_size * 1.5 ? 'none' : 'block';
        });
    }

    done();
  },

  getLuminance: function(hex) {
    if (typeof hex !== 'string' || hex.length < 4) return 0;
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
});

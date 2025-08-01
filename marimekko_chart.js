/**
 * Visualização: Gráfico de Barras de Largura Variável (v3.3 Definitiva)
 *
 * ESTRUTURA DE DADOS:
 * 1. Dimensão: As categorias para o eixo X (ex: Cliente).
 * 2. Medida 1: O valor para a altura de cada barra (Eixo Y).
 * 3. Medida 2: O valor para a largura de cada barra.
 */
looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart_definitive',
  label: 'Variable Width Bar Chart (Final)',

  _d3_ready: false,
  _elements_ready: false,

  options: {
    bar_color: {
        type: 'string', display: 'color', label: 'Bar Color', section: 'General',
        default: '#4285F4', order: 1
    },
    bar_spacing: {
        type: 'number', label: 'Space Between Bars (px)', section: 'General',
        default: 3, order: 2
    },
    show_y_axis: {
      type: 'boolean', label: 'Show Y-Axis', section: 'Axes', default: true, order: 1
    },
    y_axis_format: {
        type: 'string', label: 'Y-Axis Value Format', section: 'Axes', placeholder: 'e.g., "#,##0.0"',
        default: '', order: 2
    },
    show_labels: {
      type: 'boolean', label: 'Show Value Labels', section: 'Labels', default: true, order: 1
    },
    label_position: {
        type: 'string', label: 'Label Position', section: 'Labels', display: 'radio',
        values: [{'Inside Top': 'inside_top'}, {'Inside Middle': 'inside_middle'}, {'Outside Top': 'outside_top'}],
        default: 'inside_top', order: 2
    },
    label_rotation: {
        type: 'number', label: 'Label Rotation (°)', section: 'Labels',
        default: 0, order: 3
    },
    label_font_size: {
      type: 'number', label: 'Label Font Size', section: 'Labels', default: 12, order: 4
    },
    label_light_color: {
      type: 'string', label: 'Label Color (on Dark Bars)', section: 'Labels', display: 'color', default: '#FFFFFF', order: 5
    },
    label_dark_color: {
      type: 'string', label: 'Label Color (on Light Bars)', section: 'Labels', display: 'color', default: '#212121', order: 6
    }
  },

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
        .final-chart-container { width: 100%; height: 100%; font-family: "Google Sans", "Noto Sans", sans-serif; }
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
      <div class="final-chart-container">
        <svg class="final-chart-svg"></svg>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    if (!this._d3_ready) { setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100); return; }
    if (!this._elements_ready) {
      this._svg = d3.select(element).select('.final-chart-svg');
      this._tooltip = d3.select(element).append('div').attr('class', 'looker-tooltip custom-tooltip').style('display', 'none').style('position', 'absolute').style('pointer-events', 'none').style('z-index', 100);
      this._elements_ready = true;
    }
    this.clearErrors();
    this._svg.selectAll('*').remove();
    if (data.length === 0) { doneRendering(); return; }
    
    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;

    if (dims.length < 1 || meas.length < 2) { this.addError({ title: 'Estrutura de Campos Inválida', message: 'Requer 1 Dimensão e 2 Medidas.'}); return; }

    const xDimension = dims[0];
    const yMeasure = meas[0];
    const widthMeasure = meas[1];

    let cumulativeWidthInDataUnits = 0;
    const processedData = data.map((row, index) => {
        let heightValue = parseFloat(row[yMeasure.name]?.value);
        if (isNaN(heightValue)) { heightValue = 0; }
        let widthValue = parseFloat(row[widthMeasure.name]?.value);
        if (isNaN(widthValue)) { widthValue = 0; }
        const item = {
            index: index, xCategory: row[xDimension.name].value, yValue: heightValue, widthValue: widthValue,
            xStartInDataUnits: cumulativeWidthInDataUnits,
            _cells: { x: row[xDimension.name], y: row[yMeasure.name], width: row[widthMeasure.name] }
        };
        cumulativeWidthInDataUnits += widthValue;
        return item;
    });

    const totalWidthInDataUnits = cumulativeWidthInDataUnits;
    const yMax = d3.max(processedData, d => d.yValue);

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const chartWidth = Math.max(0, element.clientWidth - margin.left - margin.right);
    const chartHeight = Math.max(0, element.clientHeight - margin.top - margin.bottom);
    
    this._svg.attr('width', '100%').attr('height', '100%');
    const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const spacing = parseFloat(config.bar_spacing) || 0;
    const totalSpacing = (data.length - 1) * spacing;
    const drawableBarWidth = Math.max(0, chartWidth - totalSpacing);
    const xScale = d3.scaleLinear().domain([0, totalWidthInDataUnits > 0 ? totalWidthInDataUnits : 1]).range([0, drawableBarWidth]);
    const yScale = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 1]).range([chartHeight, 0]).nice();

    if (config.show_y_axis) { g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(yScale).tickFormat(d3.format(config.y_axis_format || ','))); }
    const xAxisGroup = g.append("g").attr("transform", `translate(0,${chartHeight})`).attr("class", "chart-axis");
    
    // Cadeia de D3 para desenhar as barras. Revisto para garantir que não há ponto e vírgula a meio.
    g.selectAll('.bar-rect')
      .data(processedData)
      .join('rect')
        .attr('class', 'bar-rect')
        .attr('x', d => { const x = xScale(d.xStartInDataUnits) + (d.index * spacing); return isNaN(x) ? 0 : x; })
        .attr('y', d => { const y = yScale(d.yValue); return isNaN(y) ? 0 : y; })
        .attr('width', d => { const w = xScale(d.widthValue); return isNaN(w) ? 0 : w; })
        .attr('height', d => { const h = chartHeight - yScale(d.yValue); return isNaN(h) || h < 0 ? 0 : h; })
        .attr('fill', config.bar_color)
        .on('mouseover', (event, d) => {
            const percentageOfTotalWidth = totalWidthInDataUnits > 0 ? (d.widthValue / totalWidthInDataUnits * 100) : 0;
            const tooltipHtml = `
              <div class="tooltip-title">${LookerCharts.Utils.textForCell(d._cells.x)}</div>
              <div class="tooltip-metric">
                <span class="tooltip-metric-label">${yMeasure.label_short || yMeasure.label}</span>
                <span class="tooltip-metric-value">${LookerCharts.Utils.textForCell(d._cells.y)}</span>
              </div>
              <div class="tooltip-metric">
                <span class="tooltip-metric-label">${widthMeasure.label_short || widthMeasure.label}</span>
                <span class="tooltip-metric-value">${LookerCharts.Utils.textForCell(d._cells.width)}</span>
              </div>
              <div class="tooltip-metric">
                <span class="tooltip-metric-label">% da Largura Total</span>
                <span class="tooltip-metric-value">${percentageOfTotalWidth.toFixed(1)}%</span>
              </div>
            `;
            this._tooltip.html(tooltipHtml).style('display', 'block');
        })
        .on('mousemove', (event) => {
            this._tooltip
                .style('left', (event.pageX + 15) + 'px')
                .style('top', (event.pageY + 15) + 'px');
        })
        .on('mouseout', () => {
            this._tooltip.style('display', 'none');
        })
        .on('click', (event, d) => {
            LookerCharts.Utils.openDrillMenu({
                links: d._cells.x.links,
                event: event
            });
        }); // O ponto e vírgula só aparece aqui, no final de toda a cadeia.

    processedData.forEach(d => {
        const barW = xScale(d.widthValue);
        const xPos = xScale(d.xStartInDataUnits) + (d.index * spacing);
        if (isNaN(barW) || isNaN(xPos)) return;
        const barCenter = xPos + (barW / 2);
        const barPixelWidth = barW - (spacing / 2);
        const label = xAxisGroup.append('text').attr('class', 'x-axis-label').attr('x', barCenter).attr('y', margin.bottom - 15).attr('text-anchor', 'middle').text(d.xCategory);
        if (label.node().getBBox().width > barPixelWidth && barPixelWidth > 0) {
            const charsToShow = Math.floor(barPixelWidth / 7);
            label.text(d.xCategory.substring(0, charsToShow > 0 ? charsToShow : 1) + '...');
        }
    });

    if (config.show_labels) {
        g.selectAll('.bar-label')
            .data(processedData)
            .join('text')
                .attr('class', 'bar-label')
                .text(d => LookerCharts.Utils.textForCell(d._cells.y))
                .attr('font-size', `${config.label_font_size}px`)
                .attr('fill', () => {
                    const luminance = this.getLuminance(config.bar_color);
                    return luminance > 0.5 ? config.label_dark_color : config.label_light_color;
                })
                .attr('transform', d => {
                    const x = xScale(d.xStartInDataUnits) + (d.index * spacing) + (xScale(d.widthValue) / 2);
                    let y;
                    switch(config.label_position) {
                        case 'inside_middle': y = yScale(d.yValue / 2) + config.label_font_size / 3; break;
                        case 'outside_top': y = yScale(d.yValue) - 7; break;
                        case 'inside_top': default: y = yScale(d.yValue) + config.label_font_size * 1.4; break;
                    }
                    if (isNaN(x) || isNaN(y)) return 'translate(0,0) rotate(0)';
                    return `translate(${x}, ${y}) rotate(${config.label_rotation})`;
                })
                .style('text-anchor', () => {
                    if (config.label_rotation > 10) return 'start';
                    if (config.label_rotation < -10) return 'end';
                    return 'middle';
                })
                .style('display', function(d) {
                    const barPixelHeight = chartHeight - yScale(d.yValue);
                    return (isNaN(barPixelHeight) || barPixelHeight < config.label_font_size * 1.5) ? 'none' : 'block';
                });
    }

    doneRendering();
  },

  getLuminance: function(hex) {
    if (typeof hex !== 'string' || hex.length < 4) return 0;
    hex = hex.replace("#", "");
    if (hex.length === 3) { hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]; }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 0;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
});

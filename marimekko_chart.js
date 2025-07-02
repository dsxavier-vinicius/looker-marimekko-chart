/**
 * Visualização: Gráfico de Barras de Largura Variável (v2.1 Robusta)
 *
 * ESTRUTURA DE DADOS:
 * 1. Dimensão: As categorias para o eixo X (ex: Cliente).
 * 2. Medida 1: O valor para a altura de cada barra (Eixo Y).
 * 3. Medida 2: O valor para a largura de cada barra.
 */
looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart_premium',
  label: 'Variable Width Bar Chart (Premium)',

  _d3_ready: false,
  _elements_ready: false,

  options: {
    // --- Secção: Geral ---
    bar_spacing: {
        type: 'number', label: 'Space Between Bars (px)', section: 'General',
        default: 3, order: 1
    },
    // --- Secção: Cores e Legenda ---
    color_by: {
        type: 'string', label: 'Color Bars By', section: 'Colors & Legend', display: 'select',
        values: [
            {'Single Color': 'single'},
            {'Dimension': 'dimension'},
            {'Height (Y-Value)': 'measure_y'}
        ],
        default: 'single', order: 1
    },
    color_single: {
        type: 'string', display: 'color', label: 'Single Color', section: 'Colors & Legend',
        default: '#4285F4', order: 2
    },
    color_palette: {
        type: 'array', display: 'colors', label: 'Color Palette (for Dimension)', section: 'Colors & Legend',
        default: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24'], order: 3
    },
    show_legend: {
        type: 'boolean', label: 'Show Legend', section: 'Colors & Legend', default: true, order: 4
    },
    // --- Secção: Eixos ---
    show_y_axis: {
      type: 'boolean', label: 'Show Y-Axis', section: 'Axes', default: true, order: 1
    },
    y_axis_format: {
        type: 'string', label: 'Y-Axis Value Format', section: 'Axes', placeholder: 'e.g., "#,##0.0"',
        default: '', order: 2
    },
    // --- Secção: Rótulos de Valor ---
    show_labels: {
      type: 'boolean', label: 'Show Value Labels', section: 'Labels', default: true, order: 1
    },
    label_position: {
        type: 'string', label: 'Label Position', section: 'Labels', display: 'radio',
        values: [{'Inside Top': 'inside_top'}, {'Inside Middle': 'inside_middle'}, {'Outside Top': 'outside_top'}],
        default: 'inside_top', order: 2
    },
    label_font_size: {
      type: 'number', label: 'Label Font Size', section: 'Labels', default: 12, order: 3
    },
    label_light_color: {
      type: 'string', label: 'Label Color (on Dark Bars)', section: 'Labels', display: 'color', default: '#FFFFFF', order: 4
    },
    label_dark_color: {
      type: 'string', label: 'Label Color (on Light Bars)', section: 'Labels', display: 'color', default: '#212121', order: 5
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
        .premium-chart-container { display: flex; flex-direction: column; width: 100%; height: 100%; font-family: "Google Sans", "Noto Sans", sans-serif; }
        .premium-chart-svg { flex-grow: 1; }
        .premium-chart-legend { flex-shrink: 0; padding: 10px; overflow-y: auto; text-align: left; }
        .legend-item { display: inline-flex; align-items: center; margin-right: 15px; margin-bottom: 5px; font-size: 12px; }
        .legend-color-swatch { width: 12px; height: 12px; margin-right: 8px; border-radius: 2px; flex-shrink: 0; }
        .bar-rect:hover { stroke: #333; stroke-width: 1; stroke-opacity: 0.8; cursor: pointer; }
        .chart-axis path, .chart-axis line { fill: none; stroke: #A9A9A9; shape-rendering: crispEdges; }
        .chart-axis text, .x-axis-label { fill: #333; font-size: 11px; }
        .bar-label { pointer-events: none; text-anchor: middle; }
      </style>
      <div class="premium-chart-container">
        <svg class="premium-chart-svg"></svg>
        <div class="premium-chart-legend"></div>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    if (!this._d3_ready) {
      setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100);
      return;
    }

    if (!this._elements_ready) {
      this._container = d3.select(element).select('.premium-chart-container');
      this._svg = this._container.select('.premium-chart-svg');
      this._legend = this._container.select('.premium-chart-legend');
      this._tooltip = d3.select(element).append('div').attr('class', 'looker-tooltip').style('display', 'none').style('position', 'absolute').style('pointer-events', 'none').style('z-index', 100);
      this._elements_ready = true;
    }

    this.clearErrors();
    if (data.length === 0) { doneRendering(); return; }
    
    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;

    if (dims.length < 1 || meas.length < 2) {
      this.addError({ title: 'Estrutura de Campos Inválida', message: 'Requer 1 Dimensão e 2 Medidas.'});
      return;
    }

    const xDimension = dims[0];
    const yMeasure = meas[0];
    const widthMeasure = meas[1];

    // --- CORREÇÃO: Processamento de Dados Robusto ---
    let cumulativeWidthInDataUnits = 0;
    const processedData = data.map((row, index) => {
        // Converte o valor para número e garante que é 0 se for inválido (null, undefined, etc.)
        const heightValue = +(row[yMeasure.name]?.value) || 0;
        const widthValue = +(row[widthMeasure.name]?.value) || 0;

        const item = {
            index: index,
            xCategory: row[xDimension.name].value,
            yValue: heightValue,
            widthValue: widthValue,
            xStartInDataUnits: cumulativeWidthInDataUnits,
            _cells: {
                x: row[xDimension.name],
                y: row[yMeasure.name],
                width: row[widthMeasure.name]
            }
        };
        cumulativeWidthInDataUnits += widthValue;
        return item;
    });

    const totalWidthInDataUnits = cumulativeWidthInDataUnits;
    const yMax = d3.max(processedData, d => d.yValue);

    const margin = { top: 30, right: 20, bottom: 40, left: 60 };
    const chartWidth = element.clientWidth - margin.left - margin.right;
    const chartHeight = element.clientHeight - margin.top - margin.bottom;

    this._svg.selectAll('*').remove();
    this._svg.attr('width', '100%').attr('height', '100%');
    const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    
    const totalSpacing = (data.length - 1) * config.bar_spacing;
    const drawableBarWidth = chartWidth - totalSpacing;
    const xScale = d3.scaleLinear().domain([0, totalWidthInDataUnits]).range([0, drawableBarWidth]);
    const yScale = d3.scaleLinear().domain([0, yMax > 0 ? yMax : 1]).range([chartHeight, 0]).nice(); // Evita domínio [0,0]

    let colorScale;
    // (A lógica de colorScale e updateLegend permanece a mesma)
    
    // ... (O resto do código permanece o mesmo da v2.0)

    switch(config.color_by) {
        case 'dimension':
            colorScale = d3.scaleOrdinal()
                .domain(processedData.map(d => d.xCategory))
                .range(config.color_palette);
            break;
        case 'measure_y':
            colorScale = d3.scaleSequential(d3.interpolateViridis)
                .domain([0, yMax]);
            break;
        case 'single':
        default:
            colorScale = () => config.color_single;
            break;
    }
    this.updateLegend(config, colorScale);

    if (config.show_y_axis) {
        g.append('g').attr('class', 'chart-axis').call(d3.axisLeft(yScale).tickFormat(d3.format(config.y_axis_format || ',')));
    }
    const xAxisGroup = g.append("g").attr("transform", `translate(0,${chartHeight})`).attr("class", "chart-axis");
    
    g.selectAll('.bar-rect')
      .data(processedData)
      .join('rect')
        .attr('class', 'bar-rect')
        .attr('x', d => xScale(d.xStartInDataUnits) + (d.index * config.bar_spacing))
        .attr('y', d => yScale(d.yValue))
        .attr('width', d => xScale(d.widthValue))
        .attr('height', d => chartHeight - yScale(d.yValue))
        .attr('fill', d => config.color_by === 'measure_y' ? colorScale(d.yValue) : colorScale(d.xCategory))
        .on('mouseover', (event, d) => {
            this._tooltip.style('display', 'block')
              .html(`
                <strong>${LookerCharts.Utils.textForCell(d._cells.x)}</strong><br>
                ${yMeasure.label_short || yMeasure.label}: ${LookerCharts.Utils.textForCell(d._cells.y)}<br>
                ${widthMeasure.label_short || widthMeasure.label}: ${LookerCharts.Utils.textForCell(d._cells.width)}
              `);
        })
        .on('mousemove', (event) => {
            this._tooltip
                .style('top', (event.pageY + 15) + 'px')
                .style('left', (event.pageX + 15) + 'px');
        })
        .on('mouseout', () => {
            this._tooltip.style('display', 'none');
        })
        .on('click', (event, d) => {
            LookerCharts.Utils.openDrillMenu({
                links: d._cells.x.links,
                event: event
            });
        });

    processedData.forEach(d => {
        const barPixelWidth = xScale(d.widthValue);
        const barCenter = xScale(d.xStartInDataUnits) + (d.index * config.bar_spacing) + (barPixelWidth / 2);
        const label = xAxisGroup.append('text').attr('class', 'x-axis-label').attr('x', barCenter).attr('y', margin.bottom - 10).attr('text-anchor', 'middle').text(d.xCategory);
        if (label.node().getBBox().width > barPixelWidth) {
            label.text(d.xCategory.substring(0, Math.floor(barPixelWidth / 8)) + '...');
        }
    });

    if (config.show_labels) {
        g.selectAll('.bar-label')
            .data(processedData)
            .join('text')
                .attr('class', 'bar-label')
                .attr('x', d => xScale(d.xStartInDataUnits) + (d.index * config.bar_spacing) + (xScale(d.widthValue) / 2))
                .attr('y', d => {
                    switch(config.label_position) {
                        case 'inside_middle': return yScale(d.yValue / 2);
                        case 'outside_top': return yScale(d.yValue) - 5;
                        case 'inside_top':
                        default: return yScale(d.yValue) + config.label_font_size * 1.4;
                    }
                })
                .style('font-size', `${config.label_font_size}px`)
                .style('fill', d => {
                    const bgColor = config.color_by === 'measure_y' ? colorScale(d.yValue) : colorScale(d.xCategory);
                    const luminance = this.getLuminance(bgColor);
                    return luminance > 0.5 ? config.label_dark_color : config.label_light_color;
                })
                .text(d => LookerCharts.Utils.textForCell(d._cells.y))
                .style('display', function(d) {
                    const barPixelHeight = chartHeight - yScale(d.yValue);
                    return barPixelHeight < config.label_font_size * 1.5 ? 'none' : 'block';
                });
    }

    doneRendering();
  },

  getLuminance: function(hex) {
    if (typeof hex !== 'string' || hex.length < 4) return 0;
    hex = hex.replace("#", "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  },

  updateLegend: function(config, colorScale) {
    this._legend.html('');
    this._container.style('flex-direction', 'column'); // Layout padrão

    if (!config.show_legend || config.color_by === 'single') return;
    
    // Lógica para legenda dimensional
    if (config.color_by === 'dimension') {
        const legendData = colorScale.domain();
        const legendItems = this._legend.selectAll('.legend-item')
            .data(legendData)
            .join('div')
            .attr('class', 'legend-item');

        legendItems.append('div')
            .attr('class', 'legend-color-swatch')
            .style('background-color', d => colorScale(d));
            
        legendItems.append('span')
            .text(d => d);
    }
  }
});

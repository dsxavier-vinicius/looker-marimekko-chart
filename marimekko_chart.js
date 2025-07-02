/**
 * Visualização: Gráfico de Barras de Largura Variável (v3.4 - Cores Dinâmicas)
 *
 * ESTRUTURA DE DADOS:
 * 1. Dimensão: As categorias para o eixo X (ex: Cliente).
 * 2. Medida 1: O valor para a altura de cada barra (Eixo Y).
 * 3. Medida 2: O valor para a largura de cada barra.
 */
looker.plugins.visualizations.add({
  id: 'variable_width_bar_chart_dynamic_colors',
  label: 'Variable Width Bar Chart (Colors)',

  _d3_ready: false,
  _elements_ready: false,

  options: {
    // --- REINTRODUZIDO: Secção de Cores e Legenda ---
    color_by: {
        type: 'string', label: 'Color Bars By', section: 'Colors & Legend', display: 'select',
        values: [
            {'Single Color': 'single'},
            {'By Client (Dimension)': 'dimension'}
        ],
        default: 'single', order: 1
    },
    color_single: {
        type: 'string', display: 'color', label: 'Bar Color', section: 'Colors & Legend',
        default: '#4285F4', order: 2
    },
    color_palette: {
        type: 'array', display: 'colors', label: 'Color Palette (for Dimension)', section: 'Colors & Legend',
        default: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043', '#9E9D24'], order: 3
    },
    show_legend: {
        type: 'boolean', label: 'Show Legend', section: 'Colors & Legend', default: true, order: 4
    },
    // --- Secção Geral ---
    bar_spacing: {
        type: 'number', label: 'Space Between Bars (px)', section: 'General',
        default: 3, order: 1
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
    label_rotation: {
        type: 'number', label: 'Label Rotation (°)', section: 'Labels', default: 0, order: 3
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
    if (typeof d3 === 'undefined') { /* ... lógica de carregamento ... */ }
    
    element.innerHTML = `
      <style>
        .dynamic-color-chart-container { display: flex; flex-direction: column; width: 100%; height: 100%; font-family: "Google Sans", "Noto Sans", sans-serif; }
        .chart-svg-area { flex-grow: 1; }
        .chart-legend-area { flex-shrink: 0; padding: 10px; text-align: center; overflow-y: auto; }
        .legend-item { display: inline-flex; align-items: center; margin-right: 15px; margin-bottom: 5px; font-size: 12px; }
        .legend-color-swatch { width: 12px; height: 12px; margin-right: 8px; border-radius: 2px; flex-shrink: 0; }
        .bar-rect:hover { opacity: 0.85; cursor: pointer; }
        .chart-axis path, .chart-axis line { fill: none; stroke: #C0C0C0; shape-rendering: crispEdges; }
        .chart-axis text, .x-axis-label { fill: #333; font-size: 12px; }
        .bar-label { pointer-events: none; }
        .custom-tooltip { /* ... estilo do tooltip ... */ }
      </style>
      <div class="dynamic-color-chart-container">
        <svg class="chart-svg-area"></svg>
        <div class="chart-legend-area"></div>
      </div>
    `;
  },

  updateAsync: function (data, element, config, queryResponse, details, doneRendering) {
    if (!this._d3_ready) { setTimeout(() => this.updateAsync(data, element, config, queryResponse, details, doneRendering), 100); return; }
    if (!this._elements_ready) {
      this._container = d3.select(element).select('.dynamic-color-chart-container');
      this._svg = this._container.select('.chart-svg-area');
      this._legend = this._container.select('.chart-legend-area');
      this._tooltip = d3.select(element).append('div').attr('class', 'looker-tooltip custom-tooltip').style('display', 'none').style('position', 'absolute').style('pointer-events', 'none').style('z-index', 100);
      this._elements_ready = true;
    }
    
    this.clearErrors();
    this._svg.selectAll('*').remove();
    this._legend.html('');
    if (data.length === 0) { doneRendering(); return; }
    
    // A lógica de validação e processamento de dados permanece a mesma
    const dims = queryResponse.fields.dimension_like;
    const meas = queryResponse.fields.measure_like;
    if (dims.length < 1 || meas.length < 2) { /* ... */ }
    const xDimension = dims[0], yMeasure = meas[0], widthMeasure = meas[1];
    const processedData = data.map(/* ... */);
    const totalWidthInDataUnits = /* ... */, yMax = /* ... */;

    // A lógica de cálculo de dimensões e escalas permanece a mesma
    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const chartWidth = Math.max(0, element.clientWidth - margin.left - margin.right);
    const chartHeight = Math.max(0, element.clientHeight - margin.top - margin.bottom);
    const g = this._svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const spacing = /* ... */, totalSpacing = /* ... */, drawableBarWidth = /* ... */;
    const xScale = /* ... */, yScale = /* ... */;

    // --- ATUALIZADO: Lógica da Escala de Cores ---
    let colorScale;
    if (config.color_by === 'dimension') {
        colorScale = d3.scaleOrdinal()
            .domain(processedData.map(d => d.xCategory))
            .range(config.color_palette);
    } else { // 'single' color
        colorScale = () => config.color_single;
    }

    // A lógica dos eixos permanece a mesma
    if (config.show_y_axis) { /* ... */ }
    const xAxisGroup = g.append("g").attr("transform", `translate(0,${chartHeight})`).attr("class", "chart-axis");
    
    // --- ATUALIZADO: Atributo 'fill' das barras ---
    g.selectAll('.bar-rect')
      .data(processedData)
      .join('rect')
        .attr('class', 'bar-rect')
        .attr('x', d => { const x = xScale(d.xStartInDataUnits) + (d.index * spacing); return isNaN(x) ? 0 : x; })
        .attr('y', d => { const y = yScale(d.yValue); return isNaN(y) ? 0 : y; })
        .attr('width', d => { const w = xScale(d.widthValue); return isNaN(w) ? 0 : w; })
        .attr('height', d => { const h = chartHeight - yScale(d.yValue); return isNaN(h) || h < 0 ? 0 : h; })
        .attr('fill', d => colorScale(d.xCategory)) // <-- AQUI A MUDANÇA
        .on('mouseover', /* ... */)
        .on('mousemove', /* ... */)
        .on('mouseout', /* ... */)
        .on('click', /* ... */);

    // A lógica dos rótulos do eixo X permanece a mesma
    processedData.forEach(d => { /* ... */ });

    // --- ATUALIZADO: Lógica de cor dos rótulos de valor ---
    if (config.show_labels) {
        g.selectAll('.bar-label')
            .data(processedData)
            .join('text')
                .attr('class', 'bar-label')
                .text(d => LookerCharts.Utils.textForCell(d._cells.y))
                .attr('font-size', `${config.label_font_size}px`)
                .attr('fill', d => { // <-- AQUI A MUDANÇA
                    const barColor = colorScale(d.xCategory);
                    const luminance = this.getLuminance(barColor);
                    return luminance > 0.5 ? config.label_dark_color : config.label_light_color;
                })
                .attr('transform', /* ... */)
                .style('text-anchor', /* ... */)
                .style('display', /* ... */);
    }

    // --- REINTRODUZIDO: Chamada para desenhar a legenda ---
    this.updateLegend(config, colorScale);

    doneRendering();
  },

  // --- REINTRODUZIDO: Função para desenhar a legenda ---
  updateLegend: function(config, colorScale) {
    this._legend.html(''); // Limpa a legenda anterior
    
    // Só mostra a legenda se a opção estiver ligada E se a cor for por dimensão
    if (!config.show_legend || config.color_by !== 'dimension') {
        return;
    }
    
    const legendData = colorScale.domain(); // O domínio da escala são os nomes dos clientes
    
    const legendItems = this._legend.selectAll('.legend-item')
        .data(legendData)
        .join('div')
            .attr('class', 'legend-item');

    legendItems.append('div')
        .attr('class', 'legend-color-swatch')
        .style('background-color', d => colorScale(d));
        
    legendItems.append('span')
        .text(d => d);
  },

  getLuminance: function(hex) { /* ... função inalterada ... */ }
});

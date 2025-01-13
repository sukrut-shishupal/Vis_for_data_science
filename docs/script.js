// Select the main canvas and its context
const canvas = document.getElementById('combined-canvas');
const ctx = canvas.getContext('2d');

// Select the sub-canvas and its context
const subCanvas = document.getElementById('sub-canvas');
const subCtx = subCanvas.getContext('2d');

// Initial zoom and pan settings
let zoomLevel = 1;
let offsetX = 0, offsetY = 0;
let startX, startY;
let dragging = false;

// Arrays to store the images and predictions
const negImages = [];
const posImages = [];
const allTiles = []; 
let predictionData = {};

// Variables for hover functionality
let hoveredTile = null;
const tooltip = document.getElementById('tooltip');

// Variables for image boundaries
let min_x = Infinity, max_x = -Infinity;
let min_y = Infinity, max_y = -Infinity;

// Constants for confusion matrix categories and colors
const CONFUSION_MATRIX_COLORS = {
    TP: '#1B9E77', // Teal
    TN: '#7570B3', // Violet
    FP: '#D95F02', // Orange
    FN: '#E6AB02'  // Golden yellow
};

const CONFUSION_MATRIX_LABELS = {
    TP: 'True Positive',
    TN: 'True Negative',
    FP: 'False Positive',
    FN: 'False Negative'
};

const threshold = 0.5; // Prediction threshold

const topBarButtons = [
    { label: "Contact", action: () => showPopup() },
    { label: "Introduction", action: () => showIntroductionsPopup() },
    { label: "Instruction", action: () => showInstructionsPopup() },
    { label: "Screencast", action: () => showScreencastPopup() },
    { label: "Reset", action: () => window.location.reload() }
];

const navHeight = 50;
const svg = d3.select("#nav-bar")
    .append("svg")
    .attr("height", navHeight);

function update() {
    const navWidth = window.innerWidth;
    svg.attr("width", navWidth);
    svg.selectAll("*").remove();
    svg.append("rect")
        .attr("width", navWidth)
        .attr("height", navHeight)
        .attr("fill", "#707271");

    const rightOffset = 60;
    const itemSpacing = 80;

    svg.selectAll(".nav-item")
        .data(topBarButtons)
        .enter()
        .append("text")
        .attr("class", "nav-item")
        .attr("x", (d, i) => navWidth - rightOffset - (topBarButtons.length - 1 - i) * 1.05 * itemSpacing)
        .attr("y", navHeight / 2 + 5)
        .attr("text-anchor", "middle")
        .text(d => d.label)
        .on("click", function(event, d) { d.action(); });
    
    svg.append("text")
        .attr("class", "nav-title")
        .attr("x", 20)
        .attr("y", navHeight / 2 + 8)
        .text("CellMap");

    const sidebarItems = [
        { char: "U", label: "Upload" , action: () => showUploadPopup()},
        { char: "S", label: " Switch" , action: () => toggleSvgVisibility()}
    ];

    const sidebar = d3.select("#sidebar");
    sidebar.selectAll(".sidebar-item")
        .data(sidebarItems)
        .enter()
        .append("div")
        .attr("class", "sidebar-item")
        .on("click", function(event, d) { d.action(); })
        .html(d => `
            <span class="sidebar-char">${d.char}</span>
            <span class="sidebar-text">${d.label}</span>
        `);

    document.getElementById("overlay").addEventListener("click", closePopup);
    document.getElementById("close-popup").addEventListener("click", closePopup);
    document.getElementById("close-instructions-popup").addEventListener("click", closePopup);      
    document.getElementById("close-upload-popup").addEventListener("click", closePopup);   
    document.getElementById("close-introductions-popup").addEventListener("click", closePopup);
    document.getElementById("close-screencast-popup").addEventListener("click", closePopup);
}

function showPopup() {
    const popup = document.getElementById("popup");
    const overlay = document.getElementById("overlay");
    popup.style.display = "block";
    overlay.style.display = "block";
}

function showInstructionsPopup() {
    const instructionsPopup = document.getElementById("instructions-popup");
    const overlay = document.getElementById("overlay");
    instructionsPopup.style.display = "block";
    overlay.style.display = "block";
}

function showIntroductionsPopup() {
    const introductionsPopup = document.getElementById("introductions-popup")
    const overlay = document.getElementById("overlay");
    introductionsPopup.style.display = "block";
    overlay.style.display = "block";
}

function showScreencastPopup() {
    const screencastPopup = document.getElementById("screencast-popup");
    const overlay = document.getElementById("overlay");
    screencastPopup.style.display = "block";
    overlay.style.display = "block";
}

function showUploadPopup() {
    const instructionsPopup = document.getElementById("upload-popup");
    const overlay = document.getElementById("overlay");
    instructionsPopup.style.display = "block";
    overlay.style.display = "block";
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
    document.getElementById("instructions-popup").style.display = "none";
    document.getElementById("introductions-popup").style.display = "none";
    document.getElementById("screencast-popup").style.display = "none";
    document.getElementById("upload-popup").style.display = "none";
    document.getElementById("overlay").style.display = "none";
}

function toggleSvgVisibility() {
    const rightSvgContainer = document.getElementById("right-svg-container");
    rightSvgContainer.classList.toggle("active");
}

update();
createLegend();
createCombinedCanvasLegend();

window.addEventListener("resize", update);

let filename = ""
document.getElementById('upload-btn').addEventListener('change', function(event) {
    const files = event.target.files;

    // Reset data
    min_x = Infinity; max_x = -Infinity;
    min_y = Infinity; max_y = -Infinity;
    allTiles.length = 0;
    negImages.length = 0;
    posImages.length = 0;

    let imagesLoaded = 0; 

    Array.from(files).forEach(file => {
        const pathParts = file.webkitRelativePath.split("/");
        filename = pathParts
        const folderName = pathParts[pathParts.length - 2];
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;

            img.onload = function() {
                const fileNameParts = file.name.split("_");
                const x = parseInt(fileNameParts[2].substring(1));
                const y = parseInt(fileNameParts[3].substring(1));
                const tileClass = folderName;

                const tile = { x, y, img, class: tileClass, name: file.name };
                allTiles.push(tile);

                if (tileClass === "0") {
                    negImages.push(tile);
                } else if (tileClass === "1") {
                    posImages.push(tile);
                }

                min_x = Math.min(min_x, x);
                max_x = Math.max(max_x, x + 50);
                min_y = Math.min(min_y, y);
                max_y = Math.max(max_y, y + 50);
                
                imagesLoaded++;

                if (imagesLoaded === files.length) {
                    calculateInitialZoomAndOffset(min_x, max_x, min_y, max_y);

                    const block2 = d3.select("#right-svg");

                    block2.append("text")
                        .attr("class", "block2-text")
                        .attr("x", 440)
                        .attr("y", 100)
                        .attr("text-anchor", "left")
                        .attr("fill", "black")
                        .style("font-size", "20px")
                        .text(`Image Tiles Count:\t ${imagesLoaded}`);

                    block2.append("text")
                        .attr("class", "block2-text")
                        .attr("x", 440)
                        .attr("y", 130)
                        .attr("text-anchor", "left")
                        .attr("fill", "black")
                        .style("font-size", "20px")
                        .text(`Range of x:\t ${min_x} to ${max_x}`);

                    block2.append("text")
                        .attr("class", "block2-text")
                        .attr("x", 440)
                        .attr("y", 160)
                        .attr("text-anchor", "left")
                        .attr("fill", "black")
                        .style("font-size", "20px")
                        .text(`Range of y:\t ${min_y} to ${max_y}`);

                    drawImages();   
                    drawConfusionMatrix();
                    drawSubCanvas();
                }
            };
        };

        reader.readAsDataURL(file);
    });

    const block2 = d3.select("#right-svg");

    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 420)
        .attr("y", 40)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text(`About Image Data:`);

    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 70)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`Case Name:\t ${filename[2].split("_")[0]}`);
});

document.getElementById('upload-json-btn').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            predictionData = JSON.parse(event.target.result); 
            updateTileCategories();
            drawImages();
            drawConfusionMatrix();
            drawSubCanvas();
            
            const block2 = d3.select("#right-svg");

            block2.append("text")
                .attr("class", "block2-text")
                .attr("x", 420)
                .attr("y", 200)
                .attr("text-anchor", "left")
                .attr("fill", "black")
                .style("font-size", "20px")
                .style("font-weight", "bold")
                .text(`About Annotation Data:`);

            block2.append("text")
                .attr("class", "block2-text")
                .attr("x", 440)
                .attr("y", 230)
                .attr("text-anchor", "left")
                .attr("fill", "black")
                .style("font-size", "20px")
                .text(`Prediction Count:\t ${Object.keys(predictionData).length}`);
                };
            reader.readAsText(file); 
    }
});

function calculateInitialZoomAndOffset(min_x, max_x, min_y, max_y) {
    // Calculate the total width and height of the combined images
    const totalWidth = max_x - min_x;
    const totalHeight = max_y - min_y;

    // Calculate the scale factors to fit the combined image into the canvas
    const scaleX = canvas.width / totalWidth;
    const scaleY = canvas.height / totalHeight;

    // Use the smaller scale to fit the entire image within the canvas
    zoomLevel = Math.min(scaleX, scaleY);

    // Center the image within the canvas
    offsetX = -min_x * zoomLevel + (canvas.width - totalWidth * zoomLevel) / 2;
    offsetY = -min_y * zoomLevel + (canvas.height - totalHeight * zoomLevel) / 2;

     // Apply the same to the subcanvas
    subCanvas.width = canvas.width;
    subCanvas.height = canvas.height;
}

function drawImages() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 

    ctx.save(); 
    ctx.translate(offsetX, offsetY); 
    ctx.scale(zoomLevel, zoomLevel); 

    // Draw all tiles
    allTiles.forEach(tile => {
        ctx.drawImage(tile.img, tile.x, tile.y, 50, 50);

        // Remove the blue border around class "1" tiles if not needed
        if (tile.class === "1") {
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2 / zoomLevel;
            ctx.strokeRect(tile.x, tile.y, 50, 50);
        }
    });

    // Overlay prediction data if available
    if (Object.keys(predictionData).length > 0) {
        drawPredictions();
    }

    // Highlight hovered tile if any
    if (hoveredTile) {
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2 / zoomLevel;
        ctx.strokeRect(hoveredTile.x, hoveredTile.y, 50, 50);
    }

    ctx.restore(); 
}

// Variable to store mask opacity
let maskOpacity = 0.5;

// Add an event listener for the opacity slider
document.getElementById('opacity-slider').addEventListener('input', function (e) {
    maskOpacity = e.target.value / 100;
    drawImages();
});

// Modify drawPredictions to use the maskOpacity variable
function drawPredictions() {
    // Set up the Blue-Orange colormap
    const colorInterpolator = d3.scaleLinear()
        .domain([0, 1])
        .range(["orange", "blue"]);

    // Iterate through prediction data and draw on canvas
    Object.keys(predictionData).forEach(imageName => {
        const [x, y] = extractCoordinatesFromImageName(imageName); 
        const [class0Prob, class1Prob] = predictionData[imageName]; 

        // Use the class1Prob to determine the color
        const rgbColor = d3.color(colorInterpolator(class1Prob));
        const rgbaColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${maskOpacity})`; // Apply opacity

        // Apply the color to the tile
        ctx.fillStyle = rgbaColor;
        ctx.fillRect(x, y, 50, 50);

        // Draw probability text when zoomed in sufficiently
        if (zoomLevel > 2) {
            ctx.fillStyle = 'white';
            ctx.font = `${15 / zoomLevel}px Arial`;
            const probText = `${(class1Prob * 100).toFixed(1)}%`;
            ctx.fillText(probText, x + 5, y + 25); 
        }
    });
}


function drawConfusionMatrix() {
    subCtx.clearRect(0, 0, subCanvas.width, subCanvas.height);

    // Update tile categories before drawing the confusion matrix
    updateTileCategories();

    // Determine scaling factors to fit the combined image into sub-canvas
    const totalWidth = max_x - min_x;
    const totalHeight = max_y - min_y;

    const scaleX = subCanvas.width / totalWidth;
    const scaleY = subCanvas.height / totalHeight;

    let totalTrue = 0
    let total = 0
    let TP = 0
    let TN = 0
    let FP = 0
    let FN = 0
    
    // Draw each tile
    allTiles.forEach(tile => {
        const x = (tile.x - min_x) * scaleX;
        const y = (tile.y - min_y) * scaleY;
        const width = 50 * scaleX;
        const height = 50 * scaleY;

        const category = tile.category;

        if (category) {
            if (category === "TP") {
                totalTrue += 1;
                total += 1;
                TP += 1;
            } else if (category === "TN") {
                total += 1;
                TN += 1;
            } else if (category === "FP") {
                total += 1;
                FP += 1;
            } else if (category === "FN") {
                totalTrue += 1;
                total += 1;
                FN += 1;
            }

            const color = CONFUSION_MATRIX_COLORS[category];

            subCtx.fillStyle = color;
            subCtx.fillRect(x, y, width, height);
        } else {
            // If no prediction available, draw it in gray
            subCtx.fillStyle = 'gray';
            subCtx.fillRect(x, y, width, height);
        }
    });

    const block2 = d3.select("#right-svg");

    if(totalTrue != 0){
        block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 260)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`Actual True Labels:\t ${totalTrue}`);
    
    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 290)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`True Positive:\t ${TP}`);
    
    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 320)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`True Negative:\t ${TN}`);
    
    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 350)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`False Positive:\t ${FP}`);

    block2.append("text")
        .attr("class", "block2-text")
        .attr("x", 440)
        .attr("y", 380)
        .attr("text-anchor", "left")
        .attr("fill", "black")
        .style("font-size", "20px")
        .text(`False Negative:\t ${FN}`);

        const matrix = [
            [TP, FP],
            [FN, TN]
        ];
        const labels = ["Positive", "Negative"];
        const values = [TP, FP, FN, TN];
    
        const cellSize = 100;
        const margin = { top: 80, right: 100, bottom: 80, left:90 };
        const width = 2 * cellSize + margin.left + margin.right;
        const height = 2 * cellSize + margin.top + margin.bottom;
    
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, d3.max(values)]);
    
        const svg = block2.append("svg")
            .attr("class", "confusion-matrix-heatmap")
            .attr("width", width)
            .attr("height", height)
            .style("margin", "20px");
    
        matrix.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                svg.append("rect")
                    .attr("x", margin.left + colIndex * cellSize)
                    .attr("y", margin.top + rowIndex * cellSize)
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("fill", colorScale(value))
                    .style("stroke", "black")
                    .style("stroke-width", "1px");
    
                svg.append("text")
                    .attr("x", margin.left + colIndex * cellSize + cellSize / 2)
                    .attr("y", margin.top + rowIndex * cellSize + cellSize / 2 + 5)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("fill", value > d3.max(values) * 0.5 ? "black" : "white")
                    .style("font-weight", "bold")
                    .text((value / total * 100).toFixed(2) + "%");
            });
        });
    
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top - 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Predicted");
    
        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", margin.left - 50)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .attr("transform", "rotate(-90)")
            .text("Actual");
    
        labels.forEach((label, index) => {
            svg.append("text")
                .attr("x", margin.left + index * cellSize + cellSize / 2)
                .attr("y", margin.top + 2 * cellSize + 30)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .style("fill", "black")
                .text(label);
        });
    
        labels.forEach((label, index) => {
            svg.append("text")
                .attr("x", margin.left - 30) 
                .attr("y", margin.top + index * cellSize + cellSize / 2) 
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .style("fill", "black")
                .attr("transform", `rotate(-90, ${margin.left - 30}, ${margin.top + index * cellSize + cellSize / 2})`) 
                .text(label);
        });
    
        const legendHeight = 200;
        const legendWidth = 20;
        const legendX = margin.left + 2 * cellSize + 20;
        const legendY = margin.top;
    
        const defs = svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient")
            .attr("x1", "0%")
            .attr("x2", "0%")
            .attr("y1", "0%")
            .attr("y2", "100%");
    
        linearGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", colorScale(d3.max(values)));
    
        linearGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", colorScale(0));
    
        svg.append("rect")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");
    
        svg.append("text")
            .attr("x", legendX + legendWidth + 10)
            .attr("y", legendY)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .text("High");
    
        svg.append("text")
            .attr("x", legendX + legendWidth + 10)
            .attr("y", legendY + legendHeight)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .text("Low");

        const accuracy = (TP + TN) / total;
        const precision = TP / (TP + FP);
        const recall = TP / (TP + FN);
        const f1Score = 2 * ((precision * recall) / (precision + recall));
        const data = [
            { label: "Accuracy", value: accuracy },
            { label: "Precision", value: precision },
            { label: "Recall", value: recall },
            { label: "F1 Score", value: f1Score }
        ];
        
        const chartX = 20;
        const chartY = 400;
        const chartWidth = 360;
        const chartHeight = 320;
    
        const bar_margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const innerWidth = chartWidth - bar_margin.left - bar_margin.right;
        const innerHeight = chartHeight - bar_margin.top - bar_margin.bottom;
    
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerWidth])
            .padding(0.3);
    
        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([innerHeight, 0]);
    
        const bar_svg = block2.append("svg")
            .attr("class", "block3-chart")
            .attr("x", chartX)
            .attr("y", chartY)
            .attr("width", chartWidth)
            .attr("height", chartHeight);
    
        const chartGroup = bar_svg.append("g")
            .attr("transform", `translate(${bar_margin.left},${bar_margin.top})`);
    
        chartGroup.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.label))
            .attr("y", d => yScale(d.value))
            .attr("width", xScale.bandwidth())
            .attr("height", d => innerHeight - yScale(d.value))
            .attr("fill", "darkblue");
    
        const xAxis = chartGroup.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("fill", "black")
            .style("font-size", "12px");
    
        const yAxis = chartGroup.append("g")
            .call(d3.axisLeft(yScale).tickFormat(d3.format(".0%")))
            .selectAll("text")
            .style("fill", "black")
            .style("font-size", "12px");

        chartGroup.selectAll("line")
            .style("stroke", "black");
    }
}

// New function to update the categories of each tile based on predictions
function updateTileCategories() {
    allTiles.forEach(tile => {
        const actualClass = tile.class; // "0" or "1"
        let predictedClass = null;
        let category = null;

        if (predictionData[tile.name]) {
            const [class0Prob, class1Prob] = predictionData[tile.name];
            predictedClass = class1Prob >= threshold ? "1" : "0";

            tile.probClass0 = class0Prob;
            tile.probClass1 = class1Prob;
        } else {
            predictedClass = "N/A"; 
            tile.probClass0 = null;
            tile.probClass1 = null;
        }

        if (predictedClass !== "N/A") {
            if (actualClass === "1" && predictedClass === "1") {
                category = "TP";
            } else if (actualClass === "0" && predictedClass === "0") {
                category = "TN";
            } else if (actualClass === "0" && predictedClass === "1") {
                category = "FP";
            } else if (actualClass === "1" && predictedClass === "0") {
                category = "FN";
            } else {
                category = "Unknown";
            }
        } else {
            category = null;
        }

        tile.predictedClass = predictedClass;
        tile.category = category;
    });
}

function createLegend() {
    const legendContainer = document.getElementById('confusion-matrix-legend');
    legendContainer.innerHTML = '';

    Object.keys(CONFUSION_MATRIX_COLORS).forEach(key => {
        const color = CONFUSION_MATRIX_COLORS[key];
        const label = CONFUSION_MATRIX_LABELS[key];

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;

        const text = document.createElement('span');
        text.textContent = label;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(text);

        legendContainer.appendChild(legendItem);
    });
}

function createCombinedCanvasLegend() {
    const legendContainer = document.getElementById('combined-canvas-legend');
    if (!legendContainer) {
        // Create the legend container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'combined-canvas-legend';
        container.style.position = 'absolute';
        container.style.left = '820px'; 
        container.style.top = '20px'; 
        container.style.width = '60px'; 
        container.style.height = '150px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        document.getElementById('image-container').appendChild(container);
    } else {
        legendContainer.innerHTML = ''; 
    }

    // Create an SVG inside the legend container
    const svgHeight = 150;
    const svgWidth = 90; 

    const legendSvg = d3.select('#combined-canvas-legend')
        .append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    // Define the gradient
    const gradient = legendSvg.append('defs')
        .append('linearGradient')
        .attr('id', 'blue-yellow-red-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

    // Add gradient stops
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'red'); 

    gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', 'yellow'); 

    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'blue'); 

    // Draw the gradient rectangle
    legendSvg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 20) 
        .attr('height', svgHeight)
        .style('fill', 'url(#blue-yellow-red-gradient)')
        .style('stroke', 'black') 
        .style('stroke-width', '1px');

    // Add annotations
    legendSvg.append('text')
        .attr('x', 25) 
        .attr('y', 10)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .text('Positive');

    legendSvg.append('text')
        .attr('x', 25)
        .attr('y', 145)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .text('Negative');
}

function extractCoordinatesFromImageName(imageName) {
    const parts = imageName.split("_");
    const x = parseInt(parts[2].substring(1));
    const y = parseInt(parts[3].substring(1));

    return [x, y];
}

// Mouse move event for hover functionality
canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to image coordinates
    const x = (mouseX - offsetX) / zoomLevel;
    const y = (mouseY - offsetY) / zoomLevel;

    // Find the tile under the mouse
    let foundTile = null;
    for (const tile of allTiles) {
        if (x >= tile.x && x <= tile.x + 50 && y >= tile.y && y <= tile.y + 50) {
            foundTile = tile;
            break;
        }
    }

    if (foundTile) {
        hoveredTile = foundTile;
        drawImages();
        drawSubCanvas();

        // Get prediction data if available
        let predictionInfo = '';
        let categoryInfo = '';
        let actualLabel = foundTile.class === "1" ? "True" : "False";
        let predictedLabel = 'N/A';
        let probTrue = '';
        let probFalse = '';

        if (predictionData[foundTile.name]) {
            const class0Prob = foundTile.probClass0;
            const class1Prob = foundTile.probClass1;

            predictedLabel = class1Prob >= threshold ? "True" : "False";
            probTrue = `Probability True: ${(class1Prob * 100).toFixed(2)}%`;
            probFalse = `Probability False: ${(class0Prob * 100).toFixed(2)}%`;

            if (foundTile.category) {
                categoryInfo = `Category: ${foundTile.category}`;
            }
        }

        // Update tooltip content
        tooltip.innerHTML = `
            <strong>${foundTile.name}</strong><br>
            Actual Label: ${actualLabel}<br>
            Predicted Label: ${predictedLabel}<br>
            ${probTrue}<br>
            ${probFalse}<br>
            ${categoryInfo}
        `;

        // Position the tooltip
        tooltip.style.left = e.pageX + 15 + 'px';
        tooltip.style.top = e.pageY + 15 + 'px';
        tooltip.style.display = 'block';
    } else {
        hoveredTile = null;
        drawImages();
        drawSubCanvas();
        tooltip.style.display = 'none';
    }
});

// Hide tooltip when mouse leaves the canvas
canvas.addEventListener('mouseout', function() {
    hoveredTile = null;
    drawImages();
    drawSubCanvas();
    tooltip.style.display = 'none';
    dragging = false;
});

// Zoom in/out logic
canvas.addEventListener('wheel', function (e) {
    e.preventDefault();

    const mouseX = (e.offsetX - offsetX) / zoomLevel;
    const mouseY = (e.offsetY - offsetY) / zoomLevel;

    // Calculate the scale factor for zoom
    const scaleAmount = e.deltaY * -0.01;
    const newZoomLevel = zoomLevel + scaleAmount;

    // Calculate minimum zoom level to fit the entire image in the canvas
    const totalWidth = max_x - min_x;
    const totalHeight = max_y - min_y;
    const minZoomLevel = Math.min(canvas.width / totalWidth, canvas.height / totalHeight);

    // Restrict zooming out beyond the initial state
    if (newZoomLevel <= minZoomLevel) {
        zoomLevel = minZoomLevel;
        offsetX = -min_x * zoomLevel + (canvas.width - totalWidth * zoomLevel) / 2;
        offsetY = -min_y * zoomLevel + (canvas.height - totalHeight * zoomLevel) / 2;

        // Redraw both canvases at the initial state
        drawSubCanvas();
        drawImages();
        return; // Exit to prevent further zoom-out
    }

    // Clamp zoom level to maximum value
    if (newZoomLevel > 5) {
        zoomLevel = 5; 
    } else {
        zoomLevel = newZoomLevel;
    }

    // Adjust offsets to keep the mouse position stable
    offsetX -= (mouseX * scaleAmount);
    offsetY -= (mouseY * scaleAmount);

    // Redraw both canvases
    drawImages();
    drawSubCanvas();
});

// Dragging logic for panning
canvas.addEventListener('mousedown', function(e) {
    dragging = true;
    startX = e.offsetX;
    startY = e.offsetY;
});

canvas.addEventListener('mousemove', function(e) {
    if (dragging) {
        const dx = e.offsetX - startX;
        const dy = e.offsetY - startY;
        offsetX += dx;
        offsetY += dy;
        startX = e.offsetX;
        startY = e.offsetY;

        drawImages(); 
        drawSubCanvas();
    }
});

canvas.addEventListener('mouseup', function() {
    dragging = false;
});

canvas.addEventListener('mouseout', function() {
    dragging = false;
});

function drawSubCanvas() {
    console.log("called")
    // Ensure the subcanvas matches the main canvas dimensions
    subCanvas.width = canvas.width;
    subCanvas.height = canvas.height;

    // Clear the subcanvas
    subCtx.clearRect(0, 0, subCanvas.width, subCanvas.height);

    // Save the current state of the context
    subCtx.save();

    // Apply the same transformations as the main canvas
    subCtx.translate(offsetX, offsetY);
    subCtx.scale(zoomLevel, zoomLevel);

    // Draw all tiles with their corresponding confusion matrix color
    allTiles.forEach(tile => {
        const predictedClass = predictionData[tile.name]
            ? predictionData[tile.name][1] >= threshold ? "1" : "0"
            : "N/A";

        let category = null;
        if (predictedClass !== "N/A") {
            if (tile.class === "1" && predictedClass === "1") {
                category = "TP";
            } else if (tile.class === "0" && predictedClass === "0") {
                category = "TN";
            } else if (tile.class === "0" && predictedClass === "1") {
                category = "FP";
            } else if (tile.class === "1" && predictedClass === "0") {
                category = "FN";
            }
        }

        // Use the appropriate color or gray if no prediction
        subCtx.fillStyle = category ? CONFUSION_MATRIX_COLORS[category] : 'gray';
        subCtx.fillRect(tile.x, tile.y, 50, 50);
    });

    // Restore the context to prevent accumulating transformations
    subCtx.restore();
}


// ── Dark mode support ────────────────────────────────────────────────────────
// inject.js sets window.__TC3_DARK = true/false before calling the redraw, so
// we read the explicit flag rather than re-querying localStorage (which can race).
function __tc3IsDark() {
  return window.__TC3_DARK === true;
}

const __TC3_DARK_STROKE = '#ffffff';  // white borders, connectors and text in dark mode
const __TC3_DARK_BG     = '#1e1e1e';  // canvas fill when dark (matches page bg)

// Pastel 200-level fills → saturated 400-level fills for dark mode contrast
const __TC3_DARK_FILL = {
  '#B0BEC5': '#607D8B',  // Blue Grey 200  → Blue Grey 500
  '#A5D6A7': '#4CAF50',  // Green 200      → Green 500
  '#FFAB91': '#FF5722',  // Deep Orange 200→ Deep Orange 500
};

const __tc3DrawInstances = [];
function __tc3RedrawAll() { __tc3DrawInstances.forEach(dc => dc.draw()); }
window.__tc3nav_redrawAll = __tc3RedrawAll;
// ─────────────────────────────────────────────────────────────────────────────

class DrawControl {
    constructor(canvasName, itemClass, itemBaseClass = null, itemInterfaces = []) {
        console.log('DrawControl: Initializing.');
        this.canvasName = canvasName;
        this.defaultPadding = 50;

        this.setClass(itemClass);
        this.setBaseClass(itemBaseClass);
        this.addInterfaces(itemInterfaces);
        __tc3DrawInstances.push(this);
        console.log('DrawControl: Initialized.');
    }

    setClass(c) {
        this.itemClass = c;
    }

    setBaseClass(b) {
        this.itemBaseClass = b;
    }

    addInterfaces(i) {
        this.itemInterfaces = i;
    }

    arrangeItems() {
        console.log('Arrange items.');
        let borderX = 100;
        let borderY = 100;
        let currentX = borderX;
        let currentY = borderY;
        let dimensionX = 0;
        let dimensionY = 0;
        if (this.itemInterfaces != null && this.itemInterfaces.length > 0) {
            console.log('Arranging interfaces ...');
            this.itemInterfaces.forEach(e => {
                e.x = currentX;
                e.y = currentY;
                currentX += 2 * this.defaultPadding + e.width;
            });
            dimensionX = Math.max(dimensionX, currentX + borderX - 2 * this.defaultPadding);
            dimensionY = Math.max(dimensionY, currentY + borderY);
            currentX = borderX;
            currentY += Math.max(...this.itemInterfaces.map(obj => obj.height)) + 2 * this.defaultPadding;
        }
        if (this.itemClass != null) {
            console.log('Arranging class item ...');
            console.log('arrangeItems ', this.itemClass);
            this.itemClass.x = Math.max(currentX, (dimensionX - this.itemClass.width) / 2);
            this.itemClass.y = currentY;
            dimensionX = Math.max(dimensionX, currentX + this.itemClass.width + borderX);
            dimensionY = Math.max(dimensionY, currentY + this.itemClass.height + borderY);
            currentX = borderX;
            currentY += this.itemClass.height + 2 * this.defaultPadding;
            console.log('arrangeItems ', this.itemClass);
        }
        if (this.itemBaseClass != null) {
            console.log('Arranging base class item ...');
            this.itemBaseClass.x = Math.max(currentX, (dimensionX - this.itemClass.width) / 2);
            this.itemBaseClass.y = currentY;
            dimensionX = Math.max(dimensionX, currentX + this.itemBaseClass.width + borderX);
            dimensionY = Math.max(dimensionY, currentY + this.itemClass.height + borderY);
        }

        // resize the canvas
        const canvas = document.getElementById(this.canvasName);
        console.log('Setting canvas ', this.canvasName, ' to new size ', dimensionX, dimensionY);
        canvas.width = dimensionX;
        canvas.height = dimensionY;
        console.log('Arrange items done.');
    }

    draw() {
        console.log('DrawControl: Drawing...');
        const canvas = document.getElementById(this.canvasName);
        if (canvas.getContext) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (__tc3IsDark()) {
                ctx.fillStyle = __TC3_DARK_BG;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            if (this.itemClass != null) {
                console.log(`DrawControl: Drawing class item '${this.itemClass.title}'.`);
                this.itemClass.draw(ctx);
                if (this.itemBaseClass != null) {
                    console.log(`DrawControl: Drawing base class item '${this.itemBaseClass.title}'.`);
                    this.itemBaseClass.draw(ctx);
                    this.itemClass.setExtends(this.itemBaseClass, ctx, this.defaultPadding);
                }
                if (this.itemInterfaces != null) {
                    this.itemInterfaces.forEach(e => {
                        console.log(`DrawControl: Drawing interface item '${e.title}'.`);
                        e.draw(ctx);
                        this.itemClass.setImplements(e, ctx, this.defaultPadding);
                    });
                }
            }
        }
        console.log('DrawControl: Drawing done.');
    }
}

class ClassItem {
    constructor(x, y, title = '', color = 'green', iitems = [], oitems = [], ioitems = [], mitems = [], pitems = []) {
        console.log(`ClassItem: Initializing '${title}'.`);
        this.x = x;
        this.y = y;
        this.title = title;
        this.color = 'black';
        this.bgcolor = color;
        this.iitems = iitems;
        this.oitems = oitems;
        this.ioitems = ioitems;
        this.mitems = mitems;
        this.pitems = pitems;
        this.titleFontSize = 14;
        this.titleLineHeight = this.titleFontSize + 4;
        this.fontSize = 13;
        this.lineHeight = this.fontSize + 2;
        this.font = 'Arial'
        this.padding = 10;
        this.radius = 10;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${this.titleFontSize}px ${this.font}`;
        const allTexts = [title, ...iitems, ...oitems, ...ioitems, ...mitems, ...pitems];
        const maxTextWidth = Math.max(...allTexts.map(text => tempCtx.measureText(text).width));

        this.width = maxTextWidth + this.padding * 2;
        this.height = this.padding * 2 + this.lineHeight * (1 + iitems.length + oitems.length + ioitems.length + mitems.length + pitems.length) + this.lineHeight;
        if (this.height < 100) {
            this.height = 100;
        }
        if (this.width < 100) {
            this.width = 100;
        }
        console.log('ClassItem: Initialized.');
    }

    draw(ctx) {
        const dark = __tc3IsDark();
        const origColor  = this.color;
        const origBg     = this.bgcolor;
        if (dark) {
            this.color  = __TC3_DARK_STROKE;
            this.bgcolor = __TC3_DARK_FILL[origBg] || origBg;
        }

        const r = this.radius;
        ctx.beginPath();
        ctx.moveTo(this.x + r, this.y);
        ctx.lineTo(this.x + this.width - r, this.y);
        ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + r);
        ctx.lineTo(this.x + this.width, this.y + this.height - r);
        ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - r, this.y + this.height);
        ctx.lineTo(this.x + r, this.y + this.height);
        ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - r);
        ctx.lineTo(this.x, this.y + r);
        ctx.quadraticCurveTo(this.x, this.y, this.x + r, this.y);
        ctx.closePath();

        if (!dark) {
            ctx.shadowColor   = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur    = 10;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
        } else {
            ctx.shadowColor   = 'transparent';
            ctx.shadowBlur    = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        ctx.fillStyle = this.bgcolor;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        this.drawTitle(ctx);
        this.drawText(ctx);

        this.color  = origColor;
        this.bgcolor = origBg;
    }

    drawTitle(ctx) {
        console.log('Drawing title.');
        ctx.font = `${this.titleFontSize}px ${this.font}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        this.drawLine(ctx, this.x, this.y + this.titleLineHeight, this.x + this.width, this.y + this.titleLineHeight, 1, this.color);
        ctx.fillText(this.title, this.x + this.width / 2, this.y + 5);
        console.log('Drawing title done.');
    }

    drawText(ctx) {
        console.log('Drawing text.');
        const lineHeight = this.lineHeight;
        const padding = this.padding;
        let currentY = this.y + this.padding + this.titleLineHeight; // Title already present
        ctx.font = `${this.fontSize}px ${this.font}`;

        ctx.textAlign = 'left';
        for (let item of this.iitems) {
            this.drawLine(ctx, this.x, currentY + lineHeight / 2, this.x - 20, currentY + lineHeight / 2, 1, this.color);
            ctx.fillText(`${item}`, this.x + padding, currentY);
            currentY += lineHeight;
        }

        ctx.textAlign = 'right';
        for (let item of this.oitems) {
            this.drawLine(ctx, this.x + this.width, currentY + lineHeight / 2, this.x + this.width + 20, currentY + lineHeight / 2, 1, this.color);
            ctx.fillText(`${item}`, this.x + this.width - padding, currentY);
            currentY += lineHeight;
        }

        ctx.textAlign = 'center';
        for (let item of this.ioitems) {
            this.drawLine(ctx, this.x, currentY + lineHeight / 2, this.x - 20, currentY + lineHeight / 2, 1, this.color);
            this.drawLine(ctx, this.x + this.width, currentY + lineHeight / 2, this.x + this.width + 20, currentY + lineHeight / 2, 1, this.color);
            ctx.fillText(`${item}`, this.x + this.width / 2, currentY);
            currentY += lineHeight;
        }

        ctx.textAlign = 'left';
        for (let item of this.mitems) {
            this.drawLine(ctx, this.x, currentY + lineHeight / 2, this.x - 20, currentY + lineHeight / 2, 1, this.color);
            ctx.fillText(`${item}`, this.x + padding, currentY);
            currentY += lineHeight;
        }
        for (let item of this.pitems) {
            this.drawLine(ctx, this.x, currentY + lineHeight / 2, this.x - 20, currentY + lineHeight / 2, 1, this.color);
            ctx.fillText(`${item}`, this.x + padding, currentY);
            currentY += lineHeight;
        }
        console.log('Drawing text done.');
    }

    drawLine(ctx, x1, y1, x2, y2, lineWidth, strokeStyle) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }

    setExtends(b, ctx, padding) {
        console.log(`Setting extends from '${this.title}' to '${b.title}'.`);
        const arrowStartX = this.x + this.width / 2;
        const arrowStartY = this.y + this.height;
        const arrowEndX = b.x + b.width / 2;
        const arrowEndY = b.y;

        const arr = new Arrow(arrowStartX, arrowStartY, arrowEndX, arrowEndY);
        arr.drawRect(ctx, padding);
        console.log('Setting extends done.');
    }

    setImplements(i, ctx, padding) {
        console.log(`Setting implements from '${this.title}' to '${i.title}'.`);
        const arrowStartX = this.x + this.width / 2;
        const arrowStartY = this.y;
        const arrowEndX = i.x + i.width / 2;
        const arrowEndY = i.y + i.height;

        const arr = new Arrow(arrowStartX, arrowStartY, arrowEndX, arrowEndY, 'black', 'implements');
        arr.drawRect(ctx, padding);
        console.log('Setting implements done.');
    }
}

class Arrow {
    constructor(fromX, fromY, toX, toY, color = 'black', type = 'extends') {
        console.log('Arrow: Initializing.');
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.color = color;
        this.type = type; // 'extends' or 'implements'
        console.log('arrow', this);
        console.log('Arrow: Initialized.');
    }

    drawRect(ctx, padding) {
        console.log('Arrow: Drawing.');
        const headLength = 15;
        const angle = Math.atan2(this.toY - this.fromY, 0);
        const strokeColor = __tc3IsDark() ? __TC3_DARK_STROKE : this.color;

        // Line style
        ctx.beginPath();
        if (this.type === 'implements') {
            ctx.setLineDash([5, 5]); // dashed line
        } else {
            ctx.setLineDash([]); // solid line
        }
        ctx.strokeStyle = strokeColor;
        let sgn = Math.sign(this.toY - this.fromY);
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.fromX, this.fromY + sgn * padding);
        ctx.lineTo(this.toX, this.fromY + sgn * padding);

        // Draw line (stop before triangle)
        const offsetX = Math.cos(angle) * headLength;
        const offsetY = Math.sin(angle) * headLength;
        ctx.lineTo(this.toX - offsetX, this.toY - offsetY);
        ctx.stroke();

        // Draw hollow triangle
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(this.toX, this.toY);
        ctx.lineTo(this.toX - Math.cos(angle - Math.PI / 6) * headLength, this.toY - Math.sin(angle - Math.PI / 6) * headLength);
        ctx.lineTo(this.toX - Math.cos(angle + Math.PI / 6) * headLength, this.toY - Math.sin(angle + Math.PI / 6) * headLength);
        ctx.closePath();
        ctx.stroke(); // hollow triangle
        console.log('Arrow: Drawing done.');
    }

    draw(ctx) {
        console.log('Arrow: Drawing.');
        const headLength = 15;
        const angle = Math.atan2(this.toY - this.fromY, this.toX - this.fromX);
        const strokeColor = __tc3IsDark() ? __TC3_DARK_STROKE : this.color;

        // Line style
        ctx.beginPath();
        if (this.type === 'implements') {
            ctx.setLineDash([5, 5]); // dashed line
        } else {
            ctx.setLineDash([]); // solid line
        }
        ctx.strokeStyle = strokeColor;

        // Draw line (stop before triangle)
        const offsetX = Math.cos(angle) * headLength;
        const offsetY = Math.sin(angle) * headLength;
        ctx.moveTo(this.fromX, this.fromY);
        ctx.lineTo(this.toX - offsetX, this.toY - offsetY);
        ctx.stroke();

        // Draw hollow triangle
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(this.toX, this.toY);
        ctx.lineTo(this.toX - Math.cos(angle - Math.PI / 6) * headLength, this.toY - Math.sin(angle - Math.PI / 6) * headLength);
        ctx.lineTo(this.toX - Math.cos(angle + Math.PI / 6) * headLength, this.toY - Math.sin(angle + Math.PI / 6) * headLength);
        ctx.closePath();
        ctx.stroke(); // hollow triangle
        console.log('Arrow: Drawing done.');
    }
}

var coll = document.getElementsByClassName("collapsible");
var i;

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.maxHeight){
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    } 
  });
}
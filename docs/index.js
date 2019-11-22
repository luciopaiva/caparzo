
import Caparzo from "../caparzo.js";

/**
 * @param src
 * @return {Promise<Image>}
 */
async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const options = { once: true };
        img.addEventListener("load", () => resolve(img), options);
        img.addEventListener("error", reject, options);
        img.src = src;
    });
}

class ImageExample {

    constructor () {
        this.initialize();
    }

    /** @return {void} */
    async initialize() {
        this.img = await loadImage("docs/pvt-ryan.jpg");

        this.canvas = /** @type {HTMLCanvasElement} */ document.getElementById("image-canvas");
        this.parent = this.canvas.parentElement;
        window.addEventListener("resize", this.resize.bind(this));
        this.resize();
    }

    resize() {
        const rect = this.parent.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = Math.round(rect.width * 9 / 16);

        if (this.caparzo) {
            this.caparzo.close();
        }
        this.caparzo = Caparzo.apply(this.canvas, this.onCanvasRedraw.bind(this));
    }

    /**
     * @param {Number} scale
     * @param {Number} translateX
     * @param {Number} translateY
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    onCanvasRedraw(scale, translateX, translateY, ctx, canvas) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.transform(scale, 0, 0, scale, translateX, translateY);
        ctx.drawImage(this.img, 0, 0);
        ctx.restore();
    }
}

/**
 * https://stackoverflow.com/a/52827031/778272
 * @returns {Boolean} true if system is big endian */
const isBigEndian = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
})();
console.info("Endianness: " + (isBigEndian ? "big" : "little"));

const rgbToVal = isBigEndian ?
    (r, g, b) => ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0:
    (r, g, b) => ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;

function readCssVar(varName) {
    varName = varName.startsWith("--") ? varName : "--" + varName;
    return window.getComputedStyle(document.documentElement).getPropertyValue(varName);
}

function readCssVarAsHexNumber(varName) {
    const strValue = readCssVar(varName);
    return strValue ? parseInt(strValue.replace(/[^a-fA-F0-9]/g, ""), 16) : null;
}

function cssColorToColor(cssColor) {
    return rgbToVal(cssColor >>> 16 & 0xff, cssColor >>> 8 & 0xff, cssColor & 0xff);
}

class RectRef {
    constructor (left, top, right, bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.width = this.right - this.left;
        this.height = this.top - this.bottom;
        this.x = 0;
        this.y = 0;
    }
}

class MandelbrotExample {

    constructor () {
        this.initialize();
    }

    initialize() {
        this.fgColor = rgbToVal(255, 255, 255);
        this.bgColor = cssColorToColor(0, 0, 0);

        this.canvas = /** @type {HTMLCanvasElement} */ document.getElementById("mandelbrot-canvas");
        this.parent = this.canvas.parentElement;
        window.addEventListener("resize", this.resize.bind(this));
        this.resize();
    }

    resize() {
        const CANVAS_RATIO = 9 / 16;
        // const CANVAS_RATIO = 16 / 9;

        const rect = this.parent.getBoundingClientRect();
        this.canvas.width = Math.ceil(rect.width);
        this.canvas.height = Math.ceil(rect.width * CANVAS_RATIO);
        this.ctx = this.canvas.getContext("2d");
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);

        this.mandelbrot();

        // for (let i = 0; i < this.buffer.length; i++) {
        //     this.buffer[i] = this.bgColor;
        // }
        // this.ctx.putImageData(this.imageData, 0, 0);

        // if (this.caparzo) {
        //     this.caparzo.close();
        // }
        // this.caparzo = Caparzo.apply(this.canvas, this.onCanvasRedraw.bind(this));
    }

    mandelbrot() {
        const start = performance.now();

        // const graph = new DOMRect(-2, 1.2, 3, 2.4);
        // this.obtainFittingScale(graph, this.canvas.getBoundingClientRect());

        this.buffer.fill(this.bgColor);

        // this.drawMandelbrot();
        this.drawMandelbrot2();
        // this.oldMandelbrot();

        this.ctx.putImageData(this.imageData, 0, 0);

        console.info(performance.now() - start);
    }

    drawMandelbrot() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        const input = new RectRef(0, 0, width, height);
        const output = new RectRef(-2, -1.2, 0.7, 1.2);
        this.resizeModelDomain(output, input);

        for (let y = 0; y < height; y++) {
            input.y = y;
            for (let x = 0; x < width; x++) {
                input.x = x;

                this.canvasToModelCoordinates(input, output);

                if (this.checkMandelbrot(output.x, output.y)) {
                    this.buffer[width * y + x] = this.fgColor;
                }
            }
        }
    }

    drawMandelbrot2() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        const screen = new RectRef(0, 0, width, height);
        const model = new RectRef(-2, -1.2, 0.7, 1.2);
        this.resizeModelDomain(model, screen);

        model.y = model.top;
        const stepX = model.width / screen.width;
        const stepY = model.height / screen.height;

        let index = 0;
        for (let y = 0; y < height; y++) {
            model.x = model.left;

            for (let x = 0; x < width; x++) {
                if (this.checkMandelbrot(model.x, model.y)) {
                    this.buffer[index] = this.fgColor;
                }

                index++;
                model.x += stepX;
            }

            model.y += stepY;
        }
    }

    checkMandelbrot(cRe, cIm) {
        const maxIterations = 30;

        let zRe = cRe;
        let zIm = cIm;

        for (let n = 0; n < maxIterations; n++) {
            const zRe2 = zRe * zRe;
            const zIm2 = zIm * zIm;
            if (zRe2 + zIm2 > 4) {
                return false;
            }
            zIm = 2 * zRe * zIm + cIm;
            zRe = zRe2 - zIm2 + cRe;
        }

        return true;
    }

    oldMandelbrot() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        const minRe = -2;
        const maxRe = 1;
        const minIm = -1.2;
        const maxIm = minIm + (maxRe - minRe) * height / width;
        const reFactor = (maxRe - minRe) / (width - 1);
        const imFactor = (maxIm - minIm) / (height - 1);
        const maxIterations = 30;

        for (let y = 0; y < height; y++) {
            const cIm = maxIm - y * imFactor;
            for (let x = 0; x < width; x++) {
                const cRe = minRe + x * reFactor;

                let zRe = cRe;
                let zIm = cIm;
                let isInside = true;

                for (let n = 0; n < maxIterations; n++) {
                    const zRe2 = zRe * zRe;
                    const zIm2 = zIm * zIm;
                    if (zRe2 + zIm2 > 4) {
                        isInside = false;
                        break;
                    }
                    zIm = 2 * zRe * zIm + cIm;
                    zRe = zRe2 - zIm2 + cRe;
                }
                if (isInside) {
                    this.buffer[width * y + x] = this.fgColor;
                }
            }
        }
    }

    /**
     * Will not scale; will just expand the limits of one of the dimensions so that the ratio between model's width and
     * height follows exactly the container ratio. The adjustment works to keep the center point still in the center.
     *
     * @param {RectRef} object
     * @param {RectRef} container
     */
    resizeModelDomain(object, container) {
        const containerRatio = container.width / container.height;
        const objectRatio = object.width / object.height;

        if (containerRatio < objectRatio) {
            const newWidth = object.height * containerRatio;
            const difference = newWidth - object.width;
            const halfDifference = difference / 2;
            object.left -= halfDifference;
            object.right += halfDifference;
            object.width = newWidth;
        } else {
            const newHeight = object.width / containerRatio;
            const difference = newHeight - object.height;
            const halfDifference = difference / 2;
            object.bottom -= halfDifference;
            object.top += halfDifference;
            object.height = newHeight;
        }
    }

    /**
     * This method maps object coordinates to container coordinates, making sure the object fits perfectly the screen
     * while also preserving the aspect ratio. This also works if the object turns out to be taller or wider than the
     * container. It will be shrunk appropriately.
     *
     * @param {DOMRect} object
     * @param {DOMRect} container
     */
    obtainFittingScale(object, container) {
        // ToDo write a tutorial explaining the math behind how this works

        // using abs() to deal with inverted coordinates, since the positive axis direction is usually on top in model
        // coordinates, but negative in screen coordinates
        const objHeight = Math.abs(object.bottom - object.top);
        const objWidth = Math.abs(object.right - object.left);

        const containerHeight = Math.abs(container.bottom - container.top);
        const containerWidth = Math.abs(container.right - container.left);

        const verticalRatio = objHeight / containerHeight;
        const horizontalRatio = objWidth / containerWidth;

        // This is by how much we have to multiply some measure in the screen domain to obtain the equivalent in the
        // model domain. The same factor must be used by both x and y coordinates to keep the aspect ratio preserved.
        const screenToModelFactor = Math.max(verticalRatio, horizontalRatio);

        console.info(screenToModelFactor);
    }

    /**
     * @param {{x: Number, y: Number, width: }} input
     * @param {{x: Number, y: Number}} output
     */
    modelToCanvasCoordinates(input, output) {
        const inputLeft = -2;
        const inputRight = 1;
        const inputWidth = inputRight - inputLeft;
        const x = (input.x - inputLeft) / inputWidth;  // [0..1]
        const outputLeft = 0;
        const outputWidth = this.canvas.width;
        output.x = outputLeft + x * outputWidth;

        const inputTop = 1.2;
        const inputBottom = -1.2;
        const inputHeight = inputTop - inputBottom;
        const y = (input.y - inputBottom) / inputHeight;
        const outputTop = 0;
        const outputHeight = this.canvas.height;
        output.y = outputTop + (1 - y) * outputHeight;
    }

    /**
     * @param {RectRef} input
     * @param {RectRef} output
     */
    canvasToModelCoordinates(input, output) {
        const x = (input.x - input.left) / input.width;
        output.x = output.left + x * output.width;

        const y = (input.y - input.bottom) / input.height;
        output.y = output.bottom + y * output.height;
    }

    /**
     * @param {HTMLCanvasElement} canvas
     * @return {Number}
     */
    getCanvasRatio(canvas) {
        return canvas.width / canvas.height;
    }

    /**
     * @param {Number} scale
     * @param {Number} translateX
     * @param {Number} translateY
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    onCanvasRedraw(scale, translateX, translateY, ctx, canvas) {
        // ctx.fillStyle = "black";
        // ctx.fillRect(0, 0, canvas.width, canvas.height);

        this.buffer.fill(this.bgColor);

        ctx.save();
        ctx.transform(scale, 0, 0, scale, translateX, translateY);

        this.buffer[(translateY + 100) * this.canvas.width + 100 + translateX] = this.fgColor;

        ctx.putImageData(this.imageData, 0, 0);

        ctx.restore();
    }
}

class Example {

    constructor () {
        new ImageExample();
        new MandelbrotExample();
    }
}

new Example();

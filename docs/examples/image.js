
import Caparzo from "../../caparzo.js";

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

export default class ImageExample {

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

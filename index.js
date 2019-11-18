
import PanAnZoom from "./pananzoom.js";

const TAU = Math.PI * 2;

class Example {

    constructor () {
        this.width = 900;
        this.height = 800;

        this.canvas = /** @type {HTMLCanvasElement} */ document.getElementById("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d");

        PanAnZoom.apply(this.canvas, this.onCanvasRedraw.bind(this));
        this.draw(this.ctx);
    }

    /**
     * @param {Number} scale
     * @param {Number} translateX
     * @param {Number} translateY
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    onCanvasRedraw(scale, translateX, translateY, ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.transform(scale, 0, 0, scale, translateX, translateY);
        this.draw(ctx);
        ctx.restore();
    }

    draw(ctx = this.ctx) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.ellipse(this.width / 2, this.height / 2, 50, 50, 0, 0, TAU);
        ctx.fill();
    }
}

new Example();


const SCALE_UP_FACTOR = 1.2;
const SCALE_DOWN_FACTOR = 0.8;
const MAXIMUM_SCALE = 20;
const MINIMUM_SCALE = 0.05;

export default class PanAnZoom {

    /**
     * @param {HTMLCanvasElement} canvasElement
     * @param {Function} transformCallback
     */
    constructor (canvasElement, transformCallback) {
        this.canvasElement = canvasElement;
        this.ctx = /** @type {CanvasRenderingContext2D} */ this.canvasElement.getContext("2d");
        this.transformCallback = transformCallback;

        this.isMouseDown = false;

        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.previousClientX = 0;
        this.previousClientY = 0;
    }

    onMouseDown(event) {
        this.isMouseDown = true;
        this.previousClientX = event.clientX;
        this.previousClientY = event.clientY;
    }

    onMouseUp() {
        this.isMouseDown = false;
    }

    /**
     * @param {MouseEvent} event
     */
    onMouseMove(event) {
        if (this.isMouseDown) {
            this.translateX += event.clientX - this.previousClientX;
            this.translateY += event.clientY - this.previousClientY;
            this.previousClientX = event.clientX;
            this.previousClientY = event.clientY;
            this.transform();
        }
    }

    /**
     * @param {WheelEvent} event
     */
    onWheel(event) {
        const delta = Math.sign(event.deltaY);
        const scaleDelta = delta > 0 ? SCALE_DOWN_FACTOR : SCALE_UP_FACTOR;
        const previousScale = this.scale;
        this.scale *= scaleDelta;

        if (this.scale > MAXIMUM_SCALE) {
            this.scale = MAXIMUM_SCALE;
        } else if (this.scale < MINIMUM_SCALE) {
            this.scale = MINIMUM_SCALE;
        }

        if (this.scale !== previousScale) {  // avoid translating if has no effective scaling
            this.translateX = (this.translateX - event.clientX) * scaleDelta + event.clientX;
            this.translateY = (this.translateY - event.clientY) * scaleDelta + event.clientY;
        }

        this.transform();
    }

    transform() {
        this.transformCallback(this.ctx, this.scale, this.translateX, this.translateY);
    }

    /**
     * @param {HTMLCanvasElement} canvasElement
     * @param {Function} transformCallback
     */
    static apply(canvasElement, transformCallback) {
        const instance = new PanAnZoom(canvasElement, transformCallback);
        canvasElement.addEventListener("mousedown", instance.onMouseDown.bind(instance));
        canvasElement.addEventListener("mouseup", instance.onMouseUp.bind(instance));
        canvasElement.addEventListener("mousemove", instance.onMouseMove.bind(instance));
        canvasElement.addEventListener("wheel", instance.onWheel.bind(instance));
    }
}

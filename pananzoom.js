
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

        this.isPanning = false;

        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.previousClientX = 0;
        this.previousClientY = 0;
    }

    /**
     * @param {MouseEvent} event
     */
    onMouseDown(event) {
        this.panStart(event.clientX, event.clientY);
    }

    /**
     * @param {MouseEvent} event
     */
    onMouseUp(event) {
        this.panEnd();
    }

    /**
     * @param {MouseEvent} event
     */
    onMouseMove(event) {
        if (this.isPanning) {
            this.panMove(event.clientX, event.clientY);
        }
    }

    /**
     * @param {TouchEvent} event
     */
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.panStart(touch.clientX, touch.clientY);
        }
    }

    /**
     * @param {TouchEvent} event
     */
    onTouchEnd(event) {
        event.preventDefault();
        this.panEnd();
    }

    /**
     * @param {TouchEvent} event
     */
    onTouchMove(event) {
        event.preventDefault();
        if (this.isPanning) {
            const touch = event.touches[0];
            this.panMove(touch.clientX, touch.clientY);
        }
    }

    /**
     * @param {Number} clientX
     * @param {Number} clientY
     */
    panStart(clientX, clientY) {
        this.isPanning = true;
        this.previousClientX = clientX;
        this.previousClientY = clientY;
    }

    panEnd() {
        this.isPanning = false;
    }

    panMove(clientX, clientY) {
        this.translateX += clientX - this.previousClientX;
        this.translateY += clientY - this.previousClientY;
        this.previousClientX = clientX;
        this.previousClientY = clientY;
        this.transform();
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

        // ToDo remember to save every listener here and then create a method to remove them whenever wanted

        canvasElement.addEventListener("mousedown", instance.onMouseDown.bind(instance));
        // listen on window because we want to be able to keep panning even outside of our element area
        window.addEventListener("mouseup", instance.onMouseUp.bind(instance));
        window.addEventListener("mousemove", instance.onMouseMove.bind(instance));

        canvasElement.addEventListener("touchstart", instance.onTouchStart.bind(instance));
        // for some reason, touch move and end seem to work fine out of the element even if you register them *in* it
        canvasElement.addEventListener("touchend", instance.onTouchEnd.bind(instance));
        canvasElement.addEventListener("touchmove", instance.onTouchMove.bind(instance));

        canvasElement.addEventListener("wheel", instance.onWheel.bind(instance));
    }
}

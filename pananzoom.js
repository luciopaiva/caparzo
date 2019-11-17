
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
        this.isPinching = false;

        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.previousClientX = 0;
        this.previousClientY = 0;

        this.initialPinchDistance = 0;
        this.initialScale = 0;
        this.initialTranslateX = 0;
        this.initialTranslateY = 0;
        this.initialClientX = 0;
        this.initialClientY = 0;
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
        if (event.touches.length === 2) {
            if (this.isPanning) {
                this.panEnd();
            }
            this.pinchStart(event);
        } else if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.panStart(touch.clientX, touch.clientY);
        }
    }

    /**
     * @param {TouchEvent} event
     */
    onTouchEnd(event) {
        event.preventDefault();
        if (this.isPanning) {
            this.panEnd();
        } else if (this.isPinching) {
            this.pinchEnd();
        }
    }

    /**
     * @param {TouchEvent} event
     */
    onTouchMove(event) {
        event.preventDefault();
        if (this.isPanning) {
            const touch = event.touches[0];
            this.panMove(touch.clientX, touch.clientY);
        } else if (this.isPinching) {
            this.pinchMove(event);
        }
    }

    /**
     * @param {TouchEvent} event
     */
    pinchStart(event) {
        this.isPinching = true;
        this.initialPinchDistance = this.computePinchDistance(event);
        this.initialScale = this.scale;
        this.initialTranslateX = this.translateX;
        this.initialTranslateY = this.translateY;
        [this.initialClientX, this.initialClientY] = this.computeMeanTouchPoint(event);
    }

    pinchEnd() {
        this.isPinching = false;
    }

    /**
     * @param {TouchEvent} event
     */
    pinchMove(event) {
        const distance = this.computePinchDistance(event);
        const scalingFactor = distance / this.initialPinchDistance;
        const [clientX, clientY] = this.computeMeanTouchPoint(event);

        const previousScale = this.scale;
        this.scale = this.initialScale * scalingFactor;

        // ToDo these constraints should be configurable/toggleable
        if (this.scale > MAXIMUM_SCALE) {
            this.scale = MAXIMUM_SCALE;
        } else if (this.scale < MINIMUM_SCALE) {
            this.scale = MINIMUM_SCALE;
        }

        if (this.scale !== previousScale) {  // avoid translating if has no effective scaling
            this.translateX = (this.initialTranslateX - this.initialClientX) * scalingFactor + this.initialClientX + clientX - this.initialClientX;
            this.translateY = (this.initialTranslateY - this.initialClientY) * scalingFactor + this.initialClientY + clientY - this.initialClientY;
        }

        // ToDo check if translation/scaling is the same as the previous state and avoid firing the callback if so
        this.transform();
    }

    /**
     * @param {TouchEvent} event
     * @return {[Number, Number]}
     */
    computeMeanTouchPoint(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const hor = touch1.clientX + (touch2.clientX - touch1.clientX) / 2;
        const ver = touch1.clientY + (touch2.clientY - touch1.clientY) / 2;
        return [hor, ver];
    }

    /**
     * @param {TouchEvent} event
     * @return {Number}
     */
    computePinchDistance(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const hor = touch2.clientX - touch1.clientX;
        const ver = touch2.clientY - touch1.clientY;
        return Math.hypot(hor, ver);
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
        event.preventDefault();

        // ToDo refactor the code below and extract it so it also works for the pinch method
        //      when doing it, change this logic to calculate against the initial values when the mouse down event
        //      happened (the touch method needs it this way)
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
        canvasElement.addEventListener("touchcancel", instance.onTouchEnd.bind(instance));
        canvasElement.addEventListener("touchmove", instance.onTouchMove.bind(instance));

        canvasElement.addEventListener("wheel", instance.onWheel.bind(instance));
    }
}

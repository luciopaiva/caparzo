
const SCALE_UP_FACTOR = 1.2;
const SCALE_DOWN_FACTOR = 0.8;
const MAXIMUM_SCALE = 20;
const MINIMUM_SCALE = 0.05;

export default class Caparzo {

    /**
     * @param {HTMLCanvasElement} canvasElement
     * @param {Function} transformCallback
     * @param {Number} [minimumScale]
     * @param {Number} [maximumScale]
     */
    constructor (canvasElement, transformCallback, minimumScale = MINIMUM_SCALE, maximumScale = MAXIMUM_SCALE) {
        this.canvasElement = canvasElement;
        this.ctx = /** @type {CanvasRenderingContext2D} */ this.canvasElement.getContext("2d");
        this.transformCallback = transformCallback;

        this.minimumScale = minimumScale;
        this.maximumScale = maximumScale;

        this.isPanning = false;
        this.isPinching = false;

        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.previousOffsetX = 0;
        this.previousOffsetY = 0;

        this.initialPinchDistance = 0;
        this.initialScale = 0;
        this.initialTranslateX = 0;
        this.initialTranslateY = 0;
        this.initialOffsetX = 0;
        this.initialOffsetY = 0;

        /** @type {Array<[Window|HTMLElement, String, Function]>} */
        this.eventListeners = [];

        this.registerEventListeners();
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Should be called when this object is no longer needed, so used resources are properly released.
     */
    close() {
        this.unregisterAllEventListeners();
    }

    /**
     * @param {MouseEvent} event
     */
    onMouseDown(event) {
        this.panStart(event.offsetX, event.offsetY);
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
            this.panMove(event.offsetX, event.offsetY);
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
            const offsetX = this.obtainTouchOffsetX(touch);
            const offsetY = this.obtainTouchOffsetY(touch);
            this.panStart(offsetX, offsetY);
        }
    }

    /**
     * @param {Touch} touch
     * @return {number}
     */
    obtainTouchOffsetX(touch) {
        // noinspection JSUnresolvedVariable (offsetLeft)
        return touch.pageX - touch.target.offsetLeft;
    }

    /**
     * @param {Touch} touch
     * @return {number}
     */
    obtainTouchOffsetY(touch) {
        // noinspection JSUnresolvedVariable (offsetTop)
        return touch.pageY - touch.target.offsetTop;
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
            const offsetX = this.obtainTouchOffsetX(touch);
            const offsetY = this.obtainTouchOffsetY(touch);
            this.panMove(offsetX, offsetY);
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
        [this.initialOffsetX, this.initialOffsetY] = this.computeMeanTouchPoint(event);
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
        const [offsetX, offsetY] = this.computeMeanTouchPoint(event);

        this.doScaling(offsetX, offsetY, scalingFactor);
    }

    /**
     * @param {TouchEvent} event
     * @return {[Number, Number]}
     */
    computeMeanTouchPoint(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        // noinspection JSUnresolvedVariable (offsetLeft)
        const hor = touch1.pageX + (touch2.pageX - touch1.pageX) / 2 - touch1.target.offsetLeft;
        // noinspection JSUnresolvedVariable (offsetTop)
        const ver = touch1.pageY + (touch2.pageY - touch1.pageY) / 2 - touch1.target.offsetTop;
        return [hor, ver];
    }

    /**
     * @param {TouchEvent} event
     * @return {Number}
     */
    computePinchDistance(event) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const hor = touch2.pageX - touch1.pageX;
        const ver = touch2.pageY - touch1.pageY;
        return Math.hypot(hor, ver);
    }

    /**
     * @param {Number} offsetX
     * @param {Number} offsetY
     */
    panStart(offsetX, offsetY) {
        this.isPanning = true;
        this.previousOffsetX = offsetX;
        this.previousOffsetY = offsetY;
    }

    panEnd() {
        this.isPanning = false;
    }

    panMove(offsetX, offsetY) {
        this.translateX += offsetX - this.previousOffsetX;
        this.translateY += offsetY - this.previousOffsetY;
        this.previousOffsetX = offsetX;
        this.previousOffsetY = offsetY;
        this.transform();
    }

    /**
     * @param {WheelEvent} event
     */
    onWheel(event) {
        event.preventDefault();

        const delta = Math.sign(event.deltaY);
        const scalingFactor = delta > 0 ? SCALE_DOWN_FACTOR : SCALE_UP_FACTOR;

        this.initialScale = this.scale;
        this.initialTranslateX = this.translateX;
        this.initialTranslateY = this.translateY;
        this.initialOffsetX = event.offsetX;
        this.initialOffsetY = event.offsetY;

        this.doScaling(event.offsetX, event.offsetY, scalingFactor);
    }

    doScaling(offsetX, offsetY, scalingFactor) {
        const previousScale = this.scale;
        this.scale = this.initialScale * scalingFactor;

        if (this.scale > this.maximumScale) {
            this.scale = this.maximumScale;
        } else if (this.scale < this.minimumScale) {
            this.scale = this.minimumScale;
        }

        if (this.scale !== previousScale) {  // avoid translating if has no effective scaling
            this.translateX = (this.initialTranslateX - this.initialOffsetX) * scalingFactor + offsetX;
            this.translateY = (this.initialTranslateY - this.initialOffsetY) * scalingFactor + offsetY;
        }

        // ToDo check if translation/scaling is the same as the previous state and avoid firing the callback if so
        this.transform();
    }

    transform() {
        this.transformCallback(this.scale, this.translateX, this.translateY, this.ctx, this.canvasElement);
    }

    registerEventListeners() {
        this.registerEventListener(this.canvasElement, "mousedown", this.onMouseDown.bind(this));
        // listen on window because we want to be able to keep panning even outside of our element area
        this.registerEventListener(window, "mouseup", this.onMouseUp.bind(this));
        this.registerEventListener(window, "mousemove", this.onMouseMove.bind(this));

        this.registerEventListener(this.canvasElement, "touchstart", this.onTouchStart.bind(this));
        // for some reason, touch move and end seem to work fine out of the element even if you register them *in* it
        this.registerEventListener(this.canvasElement, "touchend", this.onTouchEnd.bind(this));
        this.registerEventListener(this.canvasElement, "touchcancel", this.onTouchEnd.bind(this));
        this.registerEventListener(this.canvasElement, "touchmove", this.onTouchMove.bind(this));

        this.registerEventListener(this.canvasElement, "wheel", this.onWheel.bind(this));
    }

    /**
     * @param {Window|HTMLElement} element
     * @param {String} eventName
     * @param {Function} callback
     */
    registerEventListener(element, eventName, callback) {
        element.addEventListener(eventName, callback);
        this.eventListeners.push([element, eventName, callback]);
    }

    unregisterAllEventListeners() {
        for (const [element, eventName, callback] of this.eventListeners) {
            element.removeEventListener(eventName, callback);
        }
    }

    /**
     * @param {HTMLCanvasElement} canvasElement
     * @param {Function} transformCallback
     * @param {Number} [minimumScale]
     * @param {Number} [maximumScale]
     * @return {Caparzo}
     */
    static apply(canvasElement, transformCallback, minimumScale, maximumScale) {
        const instance = new Caparzo(canvasElement, transformCallback, minimumScale, maximumScale);
        instance.transform();
        return instance;
    }
}

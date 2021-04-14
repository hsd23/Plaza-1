/* eslint-disable func-names */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-unused-vars */

// Canvas that will display current pixel data.
import './Canvas.css';
import React, { useState, useEffect } from 'react';
// eslint-disable-next-line import/no-cycle
import { socket } from './App';
import loadingCircle from './graphics/loading_circle.gif';

// eslint-disable-next-line import/prefer-default-export
export function Canvas(props) {
    // STATES
    const [mode, setMode] = useState(0); // current mode of canvas:
    //  0 - Obtaining canvas data...
    //  1 - Timeout obtaining canvas data...
    //  2 - Success loading

    const [enabled, setEnabled] = useState(false); // set this to True to be able to click on canvas
    const [data, setData] = useState([]); // contains pixel data
    // contains width (width=height) of canvas displayed pixels
    const [canvasSize, setCanvasSize] = useState(0);
    // NOTE: This is different from HTML canvas size

    let canvasRef;
    let responseTimeout;

    // receive socketio canvas_state
    socket.on('canvas_state', (receivedData) => {
        if (mode === 0) {
            clearTimeout(responseTimeout);

            // obtain data and decode it from base 64 string:
            const encoded = receivedData.data;
            // decode to bytes
            const decoded = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

            console.log(`set data to ${decoded}`);

            setData(decoded);
            setCanvasSize(receivedData.size);

            setMode(2);
        }
    });

    // convert color index to rgb
    function toColor(x) {
        if (x === 0) {
            return [255, 0, 0];
        } if (x === 1) {
            return [255, 69, 0];
        } if (x === 2) {
            return [255, 165, 0];
        } if (x === 3) {
            return [255, 174, 66];
        } if (x === 4) {
            return [255, 255, 0];
        } if (x === 5) {
            return [154, 205, 50];
        } if (x === 6) {
            return [0, 255, 0];
        } if (x === 7) {
            return [13, 152, 186];
        } if (x === 8) {
            return [0, 0, 255];
        } if (x === 9) {
            return [138, 43, 226];
        } if (x === 10) {
            return [238, 130, 238];
        } if (x === 11) {
            return [199, 21, 133];
        } if (x === 12) {
            return [255, 255, 255];
        } if (x === 13) {
            return [0, 0, 0];
        }
        return [0, 0, 0]; // index out of bounds
    }
    // uses 'data' state to create pixels
    function redraw() {
        const context = canvasRef.getContext('2d');
        let i = 0;

        const canvasWidth = canvasRef.width;
        const canvasHeight = canvasRef.height;

        const pixelWidth = (canvasHeight / canvasSize);
        const pixelHeight = (canvasHeight / canvasSize);

        const p1 = context.transformedPoint(0, 0);
        const p2 = context.transformedPoint(canvasWidth, canvasHeight);
        context.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

        for (let x = 0; x < canvasSize; x += 1) {
            for (let y = 0; y < canvasSize; y += 1) {
                const color = toColor(data[i]);
                i += 1;
                context.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                context.fillRect(x * pixelWidth + x, y * pixelHeight + y, pixelWidth, pixelHeight);
            }
        }
    }

    // When canvas is loaded
    useEffect(() => {
        if (mode === 2) {
            canvasRef = document.getElementById('canvas');
            // eslint-disable-next-line no-use-before-define
            initializeCanvasManipulation();
        }
    }, [mode]);

    // send socketio request on load:
    useEffect(() => {
        if (mode === 0) {
            setTimeout(() => {
                socket.emit('canvas_request', {});
                responseTimeout = setTimeout(() => {
                    setMode(1);
                }, 5000);
            }, 1800);
        }
    });

    // testing function
    function test() {
        const TESTING_SIZE = 50;

        setCanvasSize(TESTING_SIZE);

        const a = new Uint8ClampedArray(TESTING_SIZE * TESTING_SIZE);
        for (let x = 0; x < TESTING_SIZE * TESTING_SIZE; x += 1) {
            // eslint-disable-next-line no-bitwise
            a[x] = (Math.random() * (13 - 0 + 1)) << 0; //generate random int between 0 & 13
        }

        setData(a);
        setMode(2);
    }

    if (mode === 0) { // CANVAS INFO NOT YET LOADED
        return (
            <div id="canvas" className="canvas_placeholder">
                <div>
                    <img src={loadingCircle} alt="" />
                </div>
            </div>
        );
    } if (mode === 1) { // TIMEOUT OBTAINING CANVAS DATA FROM SERVER
        return (
            <div id="canvas" className="canvas_placeholder">
                <div>
                    <div style={{ padding: 40 }}>
                        <h3>Unable to Load Canvas :(</h3>
                        <p>
                            <i>
                                We were unable to get canvas data from our servers.
                                Try reloading the page or trying again later.
                            </i>
                        </p>
                        <button type="button" onClick={test}>
                            Continue anyway
                        </button>
                    </div>
                </div>
            </div>
        );
    } if (mode === 2) { // SUCESSFULLY LOADED CANVAS DATA FROM SERVER
    // eslint-disable-next-line no-inner-declarations
        function onCanvasClick() {
            // TODO: implement something here...
        }

        return (
            <canvas
                id="canvas"
                onClick={onCanvasClick}
            />
        );
    }

    function initializeCanvasManipulation() {
    // IMPLEMENT CANVAS PANNING/ZOOMING     http://phrogz.net/tmp/canvas_zoom_to_cursor.html
        const canvas = canvasRef;
        const ctx = canvas.getContext('2d');

        // automatically resize canvas
        canvas.width = window.innerWidth - 50;
        canvas.height = window.innerHeight - 80;

        window.onresize = () => {
            canvas.width = window.innerWidth - 50;
            canvas.height = window.innerHeight - 80;

            trackTransforms(ctx);
            ctx.translate(canvas.width / 4, 0);
            redraw();
        };

        trackTransforms(ctx);
        ctx.translate(canvas.width / 4, 0);

        redraw();

        let lastX = canvas.width / 2; let
            lastY = canvas.height / 2;
        let dragStart; let dragged;
        canvas.addEventListener('mousedown', (evt) => {
            // eslint-disable-next-line no-multi-assign
            document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            dragStart = ctx.transformedPoint(lastX, lastY);
            dragged = false;
        }, false);
        canvas.addEventListener('mousemove', (evt) => {
            lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
            lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
            dragged = true;
            if (dragStart) {
                const pt = ctx.transformedPoint(lastX, lastY);
                ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
                redraw();
            }
        }, false);
        canvas.addEventListener('mouseup', (evt) => {
            dragStart = null;
            if (!dragged) zoom(evt.shiftKey ? -1 : 1);
        }, false);

        const scaleFactor = 1.05;
        // eslint-disable-next-line vars-on-top
        let zoom = function (clicks) {
            const pt = ctx.transformedPoint(lastX, lastY);
            ctx.translate(pt.x, pt.y);
            // eslint-disable-next-line no-restricted-properties
            const factor = Math.pow(scaleFactor, clicks);
            ctx.scale(factor, factor);
            ctx.translate(-pt.x, -pt.y);
            redraw();
        };

        const handleScroll = function (evt) {
            // eslint-disable-next-line no-nested-ternary
            const delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
            if (delta) zoom(delta);
            return evt.preventDefault() && false;
        };
        canvas.addEventListener('DOMMouseScroll', handleScroll, false);
        canvas.addEventListener('mousewheel', handleScroll, false);
    }

    // Adds ctx.getTransform() - returns an SVGMatrix
    // Adds ctx.transformedPoint(x,y) - returns an SVGPoint
    function trackTransforms(ctx) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        let xform = svg.createSVGMatrix();
        ctx.getTransform = function () { return xform; };

        const savedTransforms = [];
        const { save } = ctx;
        ctx.save = function () {
            savedTransforms.push(xform.translate(0, 0));
            return save.call(ctx);
        };
        const { restore } = ctx;
        ctx.restore = function () {
            xform = savedTransforms.pop();
            return restore.call(ctx);
        };

        const { scale } = ctx;
        ctx.scale = function (sx, sy) {
            xform = xform.scaleNonUniform(sx, sy);
            return scale.call(ctx, sx, sy);
        };
        const { rotate } = ctx;
        ctx.rotate = function (radians) {
            // eslint-disable-next-line no-mixed-operators
            xform = xform.rotate(radians * 180 / Math.PI);
            return rotate.call(ctx, radians);
        };
        const { translate } = ctx;
        ctx.translate = function (dx, dy) {
            xform = xform.translate(dx, dy);
            return translate.call(ctx, dx, dy);
        };
        const { transform } = ctx;
        ctx.transform = function (a, b, c, d, e, f) {
            const m2 = svg.createSVGMatrix();
            m2.a = a; m2.b = b; m2.c = c; m2.d = d; m2.e = e; m2.f = f;
            xform = xform.multiply(m2);
            return transform.call(ctx, a, b, c, d, e, f);
        };
        const { setTransform } = ctx;
        ctx.setTransform = function (a, b, c, d, e, f) {
            xform.a = a;
            xform.b = b;
            xform.c = c;
            xform.d = d;
            xform.e = e;
            xform.f = f;
            return setTransform.call(ctx, a, b, c, d, e, f);
        };
        const pt = svg.createSVGPoint();
        ctx.transformedPoint = function (x, y) {
            pt.x = x; pt.y = y;
            return pt.matrixTransform(xform.inverse());
        };
    }
}

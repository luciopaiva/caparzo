
# Lean Pan & Zoom Canvas Library

I wrote this library for two main reasons: first, I use panning & zooming a lot in my projects. Second, I wanted to do it right, with easy-to-read formulas that anyone else could understand and also use it in their own projects in a portable way.

Works for both desktop and mobile applications.

## How to use it

Simply import it into your script:

    import PanAnZoom from "./pananzoom.js";

And then apply it to your canvas element:

    PanAnZoom.apply(this.canvas, (scale, translateX, translateY, ctx, canvas) => {
        // this is what you'd likely do whenver the callback is fired:
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.transform(scale, 0, 0, scale, translateX, translateY);
        
        // draw your objects
        
        ctx.restore();
    });

## How it works

What follows next is a thorough explanation of how the library works under the hood. The code is really simple and easy to understand, but I want to get into the details of how some things work. So let's get to it.

### Panning

Ok, I don't really need to get into the details of how panning works because it is really easy to understand. You just need to translate the canvas by the same distance the mouse pointer moved since the last `mousedown` event.

One thing worth mentioning, however, is that although you want to register your canvas element for the `mousedown` event, it is better to register the window object as the listener for the `mousemove` and `mouseup` ones. This is because the user may feel the need to keep moving the mouse pointer out of the canvas to keep panning. Try Google Maps and see how you can even go out of the browser window and still pan.

### Scaling

Scaling may look as easy as translating at first. You just multiply your dimension by some factor. But it's not that simple. If you just scale, the zoom will be centered around the origin of the canvas. We don't want that. Open Google Maps and play with it a bit. You'll notice that the zoom is centered around where the mouse pointer is. For touch devices, it will be around where the mean point between the two fingers doing the pinch gesture is. For that, we are forced to also pan a bit whenever we change the scale so that the zoom center stays fixed at our point of interest. But how do we do that? By how much should we translate it?

Let's focus on the horizontal dimension of the image and try to understand what happens to it. Once we get the idea for one dimension, it is easy to extrapolate to two dimensions. 

Imagine that you are zooming in around the center of your canvas, which is displaying an image. Your image is getting bigger on the screen due to the multiplication factor. It will get wider and taller. Your canvas, however, stays at the same size it was. Since we want to keep the center of the image still visible (that's where our pivot point is), we need to crop the edges. Let's focus on the left edge for now. It is getting translated to the left of the screen, towards the negative direction of the horizontal axis, so the center can stay where it is.

Now imagine you are zooming *out*. The image is shrinking and the left edge is now going in the opposite way, towards the positive direction of the axis.

It looks like every time we zoom in, we also need to translate left; every time we zoom out, we translate right. It makes sense, but by how much? There are two variables involved in that answer: the *mouse position* and the *scaling factor*.

The magnitude of the translation is certainly proportional to the scaling factor. The more we zoom, the bigger the translation will be (either positive or negative). It is also certainly proportional to how far our mouse pointer is in relation to the left edge. For instance, if the pointer is exactly at the left edge, we won't need any translation. Try and visualize it. We need to keep showing that point on the screen, so the excess width is getting completely compensated by cropping on the *right* edge of the canvas. So, if we are scaling by a factor of, say, 1.2, the excess 20% width will need to be cropped on the right side. That means zero translation needed. On the other hand, if the mouse is at the right edge, we must keep that edge fixed where it is. This means the excess width now needs to be compensated by cropping from the left edge, so we now do have to translate left. By how much? Easy. If the image is 1000px wide, a scaling factor of 1.2 means we now have a zoomed-in image occupying a total width of 1200px. Our canvas is still at 1000px, so we need to crop 200px. Since we are keeping the right edge fixed, this means we need to translate 200px to the left.

Now we know the minimum (0px) and maximum (-200px) values we are ever going to need to translate the 1000px wide pixel for a scaling factor of 1.2. Great, but what if the mouse pointer is neither at the left edge nor at the right one? Well, you probably guessed it already: we just calculate the weighted average between the two (i.e., we do a linear interpolation). Here's the basic formula:

    translateX = mouseX - mouseX * scalingFactor

Or simply:

    translateX = mouseX * (1 - scalingFactor)

Let's try that formula and see if it works. If there is no zooming in or out (i.e, the scaling factor is 1):

    translateX = mouseX * (1 - 1) = 0;  // no translation needed, independently of where the mouse pointer is

Now let's test it with the values we mentioned above. When the mouse is at the left edge:

    scalingFactor = 1.2;
    mouseX = 0;  // at the left edge
    translateX = 0 * (1 - 1.2) = 0;  // no translation

When the mouse is at the right edge:

    scalingFactor = 1.2;
    mouseX = 1000;  // at the right edge
    translateX = 1000 * (1 - 1.2) = 1000 * (-0.2) = -200;  // translate 200px to the left

Any other place the mouse is, the formula will automatically interpolate the translation amount for you. For example:

    scalingFactor = 1.2;
    mouseX = 600;
    translateX = 600 * (1 - 1.2) = 600 * (-0.2) = -120;

#### Preserving the previous translation

Well, what if there was any translation and/or scaling previously? How will the new scaling affect it?

Let's go back to the idea of placing the mouse pointer at the edges of the canvas. Put it at the right edge. We are scaling by a new factor of 1.1 an image that was already scaled by a factor of 1.2. Consider the previous scaling also took place centered at the right edge. This means the excess 200px of width were completely cropped from the left edge, i.e., the image is translated 200px left. We are now scaling by a factor of 1.1, so the width is now growing from 1200px to 1320px. Since we want to keep the right edge fixed, the excess is once again being completely directed to the left edge.

Notice, however, that we are now scaling not only 1000px, but a total of 1200px. This means we are also scaling the part the was already translated to the left of the canvas. This is very important as it will change a bit the formula we had before. But let's not get ahead of ourselves.

Place the mouse at the left edge now. In the previous section, putting the pivot point at the left edge meant no translation at all. That is not the case now. Since the whole image is being scaled, not just the visible part, it means the 200px of image we cropped to the left of the left edge are also getting scaled. Since we want to keep the left edge fixed, we need to keep those 200px cropped out even after we scale the image up. This means we have to translate an extra 10% of those pixels (since we are scaling by an extra 1.1), i.e., we need to further translate left by 20px, summing up to a total final translation of -220px.

Like before, intermediate points will need to be interpolated. Here's the updated formula:

    translationDueToMousePosition = mouseX * (1 - scalingFactor);
    translationDueToCroppedPart = previousTranslateX * scalingFactor;  // the new part
    translateX = translationDueToMousePosition + translationDueToCroppedPart;

Or, refactoring it a bit:

    translateX = (previousTranslateX - mouseX) * scalingFactor + mouseX;

So there you have it. That's all you need for scaling in one dimension. Now for two dimensions is the same idea: just repeat the same formula for the y axis :-)

### Touch events

#### Panning

Like with the mouse panning, this one is also simple. Just check the code, it's easy to understand.

#### Pinch

Scaling via pinch gestures is similar. The scaling pivot point is still there, although it is now not a mouse pointer, but the mean point between the two fingers doing the pinch gesture. The scaling factor is obviously also there, but it's now the difference in distance between the two fingers while the pinch gesture happens.

There is a small thing to note about the pivot point, however. It should not be updated while the gesture is being performed. Try it yourself. Notice that the final result doesn't seem natural; it is not exactly what you would expect. So you must save the initial mean point (I call it `initialPinchX` in the formula below) and use it for all `touchmove` events that follow.

And, about `touchmove` events, beware that they happen a lot, even if the fingers are not moving. So just a heads up that you should keep your handler as light as possible.

So here's the formula so far:

    translateX = (initialTranslateX - initialPinchX) * scalingFactor + initialPinchX;

But there's one last thing: open Google Maps and notice that while you're zooming in and out using the pinch gesture, you are also able to *pan* the map. It would be nice to be able to do that as well. The change needed is really easy: you just have to track how the mean point moved since the gesture started. The initial mean point you already have; now you just need to calculate it also every time a `touchmove` event happens. Take the difference between the last measure made and the initial one and you have you panning delta. Then just add that to your formula:

    panningDelta = pinchX - initialPinchX;
    translateX = (initialTranslateX - initialPinchX) * scalingFactor + initialPinchX + panningDelta;

Notice that you can simplify it a bit since we are adding `initialPinchX` and then subtracting it. Here's the simplified version:

    translateX = (initialTranslateX - initialPinchX) * scalingFactor + pinchX;

And that's it! That's your formula for scaling using the pinch gesture.

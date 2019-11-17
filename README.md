
# Pan & Zoom Lean Library for Canvases

## Scaling

Scaling may look as easy as translating at first. You just multiply your dimension by some factor. But it's not that simple. If you just scale, the zoom will be centered around the origin of the canvas. We don't want that. Open Google Maps and play with it a bit. You'll notice that the zoom is centered around where the mouse pointer is. For touch devices, it will be around where the mean point between the two fingers doing the pinch movement is. For that, we need to pan a bit whenever we change the scale so that the zoom happens around our point of interest. But how do we do that? Should we translate it by how much?

Let's focus on the horizontal dimension of the image and try to understand what happens to it. Once we get the idea for one dimension, it is easy to extrapolate to two dimensions. 

Imagine that you are zooming in around the center of your canvas, which is showing an image. Your image is getting bigger on the screen due to the multiplication factor. It will get wider and taller. Your canvas, however, stays at the same size it was. Since we want to keep the center of the image still visible, we need to crop the edges. Think about the left edge. It is getting translated to the left of the screen, towards the negative direction of the horizontal axis, so the center can stay where it is.

Now imagine you are zooming *out*. The image is shrinking and the left edge is now going in the opposite direction, towards the positive direction.

It looks like every time we zoom in, we also need to translate left; every time we zoom out, we translate right. It makes sense, but by how much? There are two variables involved: the mouse position and the scaling factor.

The magnitude of the translation is certainly proportional to the scaling factor. The more we zoom, the bigger the translation will be. It is also certainly proportional to how far our mouse pointer is in relation to the left edge. If the mouse is right at the left edge, we won't need any translation. We need to keep showing that point on the screen, so the excess width is getting 100% compensated by cropping the right edge of the image. If we are scaling by a factor of 1.2, the excess 20% width will need to be cropped on the right side. That means zero translation needed. On the other hand, if the mouse is at the right edge, we must keep that edge fixed where it is. This means the excess width now needs to be compensated by cropping from the left edge, so we now do have to translate left. By how much? Easy. If the image is 1000px wide, a scaling factor of 1.2 means we now have a zoomed-in image occupying a total width of 1200px. Our canvas is still at 1000px, so we need to crop 200px. Since we are keeping the right edge fixed, this means we need to translate 200px to the left.

Now we know the minimum (0px) and maximum (200px) values we are ever going to need to translate the 1000px wide pixel for a scaling factor of 1.2. Great, but what if the mouse pointer is neither at the left edge nor at the right one? Well, you probably guessed it already: we just interpolate it linearly! Here's the basic formula:

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
    mouseX = 1000;
    translateX = 1000 * (1 - 1.2) = 1000 * (-0.2) = -200;  // translate 200px to the left

Any other place the mouse is, the formula will automatically interpolate the translation amount for you:

    scalingFactor = 1.2;
    mouseX = 600;
    translateX = 600 * (1 - 1.2) = 600 * (-0.2) = -120;

### Preserving the previous translation

Well, what if there was any translation and/or scaling previously? How will the new scaling affect it?

Let's go back to the idea of placing the mouse pointer at the edges of the canvas. Put it at the right edge. We are scaling by a new factor of 1.1 an image that was already scaled by a factor of 1.2. Consider the previous scaling also took place centered at the right edge. This means the excess 200px of width were totally cropped from the left edge, i.e., the image is translated 200px left. We are now scaling by a factor of 1.1, so the width is now growing from 1200px to 1320px. Since we want to keep the right edge fixed, the excess is once again being totally redirected to the left edge.

Notice, however, that we are now scaling not only 1000px, but a total of 1200px. This means we are also scaling the part the was already translated to the left of the canvas. This is very important as it will change a bit the formula we had before. But let's not get ahead of ourselves.

Place the mouse at the left edge now. In the previous section, scaling centered around the left edge meant no translation at all. That is not the case now. Since the whole image is being scaled, not just the visible part, it means the 200px of image we cropped to the left of the left edge are also getting scaled. Since we want to keep the left edge fixed, we need to keep those 200px cropped out even after we scale the image up. This means we have to translate an extra 10% of those pixels (since we are scaling by an extra 1.1), i.e., we need to further translate left by 20px, summing to a total of 220px.

Once again, every intermediate point will need to be interpolated. Here's the updated formula:

    translationDueToMousePosition = mouseX * (1 - scalingFactor);
    translationDueToCroppedPart = previousTranslateX * scalingFactor;
    translateX = translationDueToMousePosition + translationDueToCroppedPart;

Or, refactoring it a bit:

    translateX = (previousTranslateX - mouseX) * scalingFactor + mouseX;

So there you have it. That's all you need for scaling in one dimension. Now for two dimensions is ridiculously simple: just use the same formula separately for the y axis :-)

## Touch events

### Pinch

Scaling via pinching is almost exactly the same idea. The scaling pivot point is still there, although it is now not a mouse pointer, but the mean point between the two fingers doing the pinch gesture. The scaling factor is obviously also there, but it's now the difference in distance between the two fingers while the pinch gesture happens.

There is a small thing to note about the pivot point, however. It should not be updated while the gesture is being performed. Try it yourself. Notice that the final result doesn't seem natural; it is not exactly what you would expect. So you must save the initial mean point and use it for all `touchmove` events that follow.

And, about `touchmove` events, beware that they happen a lot, even if the fingers are not moving. So just a heads up that you should keep your handler as light as possible.

So here's the formula so far:

    translateX = (initialTranslateX - initialPinchX) * scalingFactor + initialPinchX;

But there's one last thing: open Google Maps and notice that while you're zooming in and out the map using the pinch gesture, you are also able to *pan* the map. It would be nice to be able to do that as well. The change needed is really easy: you just have to track how the mean point moved since the gesture started. The initial mean point you already have; now you just need to calculate it also every time a `touchmove` event happens. Take the difference between the last measure made and the initial one and you have you panning delta. Then just add that to your formula:

    translateX = (initialTranslateX - initialPinchX) * scalingFactor + initialPinchX + (pinchX - initialPinchX);

Notice that you can simplify it a bit:

    translateX = (initialTranslateX - initialPinchX) * scalingFactor + pinchX;

And that's it! That's your formula for scaling using the pinch gesture.

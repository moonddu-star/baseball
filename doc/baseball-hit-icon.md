# Baseball hit tile sprite

Created with the built-in image generation tool at the user's request. The generated transparent PNG is preserved without modification in `source-assets/images/baseball-hit-icon.png` and copied to `poc/assets/images/baseball-hit-icon.png`. The build manifest publishes it at `assets/baseball-hit-icon.png` and the page preloads it.

Successful board tiles display only this image, centered at 57.4% of the tile size (maximum 50.4px), reduced to 70% of the initial icon dimensions, without the previous emoji or HIT text. Accessible tile labels still announce hit status. The large HIT! feedback and the animated pitched ball are unchanged.

## Generation prompt

Use case: stylized-concept. Asset type: single transparent PNG baseball sprite for a realistic baseball game's successful-hit grid tile, displayed at 24–64 pixels. Create exactly ONE centered circular baseball, entirely visible, filling 85% of a square canvas, with a genuinely transparent alpha background. Polished realistic 3D sports UI icon, ivory white leather, two very recognizable curved red stitched seams, subtly pebbled leather, gently rounded volume, bright upper-left highlight and restrained cool navy lower-right shading. Strong clear red stitching and clean silhouette readable at tiny sizes. Front-facing sphere, balanced diagonal seam orientation. No text, no HIT lettering, no logo, no badge, no frame, no floor or cast shadow outside the ball, no glow, no extra objects, no checkerboard painted in image. Preserve actual transparent pixels outside the baseball.

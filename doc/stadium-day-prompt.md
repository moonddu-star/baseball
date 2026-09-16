# Day stadium generation

Method: built-in image_gen, lighting/weather edit of the existing night stadium, explicitly requested by the user. The generated image was reviewed before being added to DAY GAME. The night source remains unchanged.

Reference: `poc/assets/images/stadium-clean.png`.
Generated master: `source-assets/images/stadium-day.png`.
Runtime copy: `poc/assets/images/stadium-day.png`.

## Final prompt

Use case: lighting-weather. Edit the provided nighttime baseball stadium into the SAME stadium in a clear daytime game. This is a production background asset for a portrait baseball game, NOT a screenshot or UI mockup. Preserve the original portrait aspect ratio 941:1672 (approximately 9:16), camera position behind home plate, focal length, perspective, horizon, stadium architecture, stands, crowd, center field wall, every field marking, home plate, foreground glove, grass boundaries, and pitcher's mound positions and proportions EXACTLY. Do not move, zoom, crop, or redesign geometry. The mound must remain centered around x=50%, y=33.5% of image height, and the home plate around x=50%, y=79.5%. Change only time of day and lighting: natural blue daytime sky with a few soft white clouds, clear afternoon sunlight, realistic daylight exposure and natural green grass and warm brown dirt. Stadium floodlights and concourse lights are switched OFF, no glowing bulbs, no light blooms or night haze. Keep the field empty, no pitcher, batter, catcher or ball (the game overlays an animated pitcher separately). Preserve the small foreground glove already present. Match photographic realism and detailed texture of the input. No text, logos, HUD, borders, watermark, or additional objects. Return one full-background portrait image.

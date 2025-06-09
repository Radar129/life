# **App Name**: Life

## Core Features:

- Mode Selection: Clear choice between 'I Need Help' (Victim) and 'Rescue Team Login' modes.
- Panic Button: A prominent button on the home screen to trigger SOS features immediately.
- Bluetooth SOS: Transmit device location as SOS signal via Bluetooth; signal broadcasts device name `SOS_LAT_LON`.
- SOS Scanner: Scan for nearby SOS signals broadcast via Bluetooth from victims.
- Map Display: Display a map showing locations of detected SOS signals, using device GPS and trilateration.
- Signal Display: Display relative proximity to the device broadcasting a particular SOS, calculated based on Bluetooth RSSI values.
- Rescuer Advice Tool: LLM suggesting likely next-best-action based on conditions at the distress scene. Rescuer must input what's going on in the field, the tool decides on one or more standard practices that will give them a hand in helping

## Style Guidelines:

- HSL(220, 70%, 50%) which converts to a hex code of #3D85DA, a vibrant blue to convey trust and urgency.
- Light gray-blue, HSL(220, 20%, 95%), equivalent to #F0F4F7, providing a clean and unobtrusive backdrop.
- A contrasting shade of purple, HSL(250, 60%, 60%), equivalent to #7A5BA6. This vivid highlight emphasizes important CTAs without stealing attention from the key visuals.
- 'PT Sans' (sans-serif) for a modern, readable style.
- 'Space Grotesk' (sans-serif), suitable for headlines and short amounts of body text, lends a computerized feel that meshes well with a lifesaving app.
- Simple, clear icons that follow established UI patterns to communicate the functionality and status of various features (e.g., GPS, Bluetooth).
- Prioritize information by importance; critical functions like the panic button and mode selection are always in plain sight.
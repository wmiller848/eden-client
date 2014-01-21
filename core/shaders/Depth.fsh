precision mediump float;

uniform float uNear;
uniform float uFar;

varying vec4 vViewPosition;

/// Pack a floating point value into an RGBA (32bpp).
/// Note that video cards apply some sort of bias (error?) to pixels,
/// so we must correct for that by subtracting the next component's
/// value from the previous component.
vec4 pack (float depth) {
    const vec4 bias = vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);

    float r = depth;
    float g = fract(r * 255.0);
    float b = fract(g * 255.0);
    float a = fract(b * 255.0);
    vec4 colour = vec4(r, g, b, a);
    return colour - (colour.yzww * bias);
}

void main(void) {
    // Linear depth
    float linearDepth = length(vViewPosition) / (uFar - uNear);

    //gl_FragColor = pack(gl_FragCoord.z);
    gl_FragColor = pack(linearDepth);
}
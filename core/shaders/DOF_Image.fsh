precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler0; // color texture
uniform sampler2D uSampler1; // depth texture
uniform sampler2D uSampler2; // Blurred texture

uniform float uBlurCoefficient; // Calculated from the blur equation, b = ( f * ms / N )
uniform float uFocusDistance; // The distance to the subject in perfect focus (= Ds)
uniform float uNear; // Near clipping plane
uniform float uFar; // Far clipping plane
uniform float uPPM; // Pixels per millimetre

/// Unpack an RGBA pixel to floating point value.
float unpack (vec4 colour) {
    const vec4 bitShifts = vec4(1.0,
                                1.0 / 255.0,
                                1.0 / (255.0 * 255.0),
                                1.0 / (255.0 * 255.0 * 255.0));

    return dot(colour, bitShifts);
}

/// Calculate the blur diameter to apply on the image.
/// b = (f * ms / N) * (xd / (Ds +- xd))
/// Where: /// (Ds + xd) for background objects
/// (Ds - xd) for foreground objects
float GetBlurDiameter (float d) {
    // Convert from linear depth to metres
    float Dd = d * (uFar - uNear);
    float xd = abs(Dd - uFocusDistance);
    float xdd = (Dd < uFocusDistance) ? (uFocusDistance - xd) : (uFocusDistance + xd);
    float b = uBlurCoefficient * (xd / xdd);
    return b * uPPM;
}

void main(void) {
    // Maximum blur radius to limit hardware requirements.
    // Cannot #define this due to a driver issue with some setups
    const float MAX_BLUR_RADIUS = 15.0;

    // Get the colour, depth, and blur pixels
    vec4 colour = texture2D(uSampler0, vTextureCoord);
    float depth = unpack(texture2D(uSampler1, vTextureCoord));
    vec4 blur = texture2D(uSampler2, vTextureCoord);

    // Linearly interpolate between the colour and blur pixels based on DOF
    float blurAmount = GetBlurDiameter(depth);
    float lerp = min(blurAmount / MAX_BLUR_RADIUS, 1.0);

    // Blend
    gl_FragColor = (colour * (1.0 - lerp)) + (blur * lerp);
}
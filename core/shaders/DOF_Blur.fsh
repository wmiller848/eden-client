precision mediump float;

varying vec2 vTextureCoord;

uniform vec2 uTexelSize; // Size of one texel (1 / width, 1 / height)
uniform sampler2D uSampler0; // color texture
uniform sampler2D uSampler1; // depth texture

uniform bool uOrientation; // false = horizontal, true = vertical
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

    float depth = unpack(texture2D(uSampler1, vTextureCoord));
    float blurAmount = GetBlurDiameter(depth);
    blurAmount = min(floor(blurAmount), MAX_BLUR_RADIUS);

    // Apply the blur
    float count = 0.0;
    vec4 colour = vec4(0.0);
    vec2 texelOffset;
    if (uOrientation == false)
        texelOffset = vec2(uTexelSize.x, 0.0);
    else
        texelOffset = vec2(0.0, uTexelSize.y);

    if (blurAmount >= 1.0)
    {
        float halfBlur = blurAmount * 0.5;
        for (float i = 0.0; i < MAX_BLUR_RADIUS; ++i)
        {
            if (i >= blurAmount)
                break;

            float offset = i - halfBlur;
            vec2 vOffset = vTextureCoord + (texelOffset * offset);
            colour += texture2D(uSampler0, vOffset);
            count++;
        }
    }

    // Apply colour
    if ( count > 0.0 )
        gl_FragColor = colour / count;
    else
        gl_FragColor = texture2D(uSampler0, vTextureCoord);
}
precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler0;

/// Unpack an RGBA pixel to floating point value.
float unpack (vec4 colour) {
    const vec4 bitShifts = vec4(1.0,
                                1.0 / 255.0,
                                1.0 / (255.0 * 255.0),
                                1.0 / (255.0 * 255.0 * 255.0));
    return dot(colour, bitShifts);
}

void main(void) {
    float depth = unpack(texture2D(uSampler0, vTextureCoord));
    gl_FragColor = vec4(depth, depth, depth, 1.0);
}
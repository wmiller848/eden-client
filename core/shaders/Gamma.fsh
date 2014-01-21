precision mediump float;

varying vec2 vTextureCoord;

uniform float uBrightness; // 0 is the centre. < 0 = darken, > 1 = brighten
uniform float uContrast; // 1 is the centre. < 1 = lower contrast, > 1 is raise contrast
uniform float uGamma; // Inverse gamma correction applied to the pixel

uniform sampler2D uSampler0; // Colour texture to modify

void main (void) {
    // Get the sample
    vec4 colour = texture2D(uSampler0, vTextureCoord);
    // Adjust the brightness
    colour.xyz = colour.xyz + uBrightness;
    // Adjust the contrast
    colour.xyz = (colour.xyz - vec3(0.5)) * uContrast + vec3(0.5);
    // Clamp result
    colour.xyz = clamp(colour.xyz, 0.0, 1.0);
    // Apply gamma, except for the alpha channel
    colour.xyz = pow(colour.xyz, vec3(1.0/uGamma));
    // Set fragment
    gl_FragColor = colour;
}
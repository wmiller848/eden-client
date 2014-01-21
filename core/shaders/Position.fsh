precision mediump float;

varying vec4 vViewPosition;

uniform float uNear;
uniform float uFar;

void main (void) {
    float linearDepth = length(vViewPosition) / (uFar - uNear);
    gl_FragColor = vec4(vViewPosition.x, vViewPosition.y, vViewPosition.z, linearDepth);
}
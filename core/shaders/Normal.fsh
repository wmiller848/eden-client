precision mediump float;

varying vec3 vViewNormal;

void main (void) {
    vec3 normal = normalize(vViewNormal);
    gl_FragColor = vec4(normal.x, normal.y, normal.z, 0.0);
}
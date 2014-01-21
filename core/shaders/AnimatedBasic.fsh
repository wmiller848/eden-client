precision mediump float;

varying vec3 vWorldNormal;
varying vec4 vWorldPosition;
varying vec4 vViewPosition;

varying vec2 vTextureCoord;

uniform float uMaterialShininess;

uniform bool uUseLighting;
uniform bool uUseTexture;

uniform vec4 uMatColor;

uniform vec3 uPointLightingLocation;
uniform vec3 uPointLightingSpecularColor;
uniform vec3 uPointLightingDiffuseColor;
uniform vec3 uPointLightAttenuation;

uniform float uPointLightStrength;
uniform float uGamma;

uniform sampler2D uSampler;

void main(void) {
    vec3 lightWeighting;
    if (!uUseLighting)
    {
        lightWeighting = vec3(1.0, 1.0, 1.0);
    }
    else
    {
        vec3 lightDirection = normalize(uPointLightingLocation.xyz - vWorldPosition.xyz);
        float diffuseLightWeighting = max(dot(lightDirection, vWorldNormal), 0.0);

        vec3 reflectionDirection = -normalize(reflect(lightDirection, vWorldNormal));
        float specularLightWeighting = pow(max(dot(reflectionDirection, vViewPosition.xyz), 0.0), uMaterialShininess);

        float d = distance(vWorldPosition.xyz, uPointLightingLocation.xyz);
        float attenuation = 1.0 / (uPointLightAttenuation.x + (uPointLightAttenuation.y * d) + (uPointLightAttenuation.z * d * d));

        lightWeighting = ((uPointLightingDiffuseColor * diffuseLightWeighting)
        + (uPointLightingSpecularColor * specularLightWeighting)) * attenuation * uPointLightStrength;
    }

    vec4 fragmentColor = uMatColor;
    if(uUseTexture)
        fragmentColor *= vec4(pow(texture2D(uSampler, vTextureCoord).rgb, vec3(uGamma)), 1.0); // convert to linear space

    gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, uMatColor.a);
    //gl_FragColor = vec4(pow(fragmentColor.rgb * lightWeighting, vec3(1.0/uGamma)), uMatColor.a);
}
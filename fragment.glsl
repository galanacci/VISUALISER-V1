precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_rotation;
uniform float u_zoom;

#define PI 3.14159265359
#define PHI 1.61803398875
#define MAX_POINTS 1000

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float drawPoint(vec2 uv, vec2 point, float size) {
    float d = length(uv - point);
    return smoothstep(size, size * 0.5, d);
}

mat3 rotateY(float angle) {
    return mat3(
        cos(angle), 0.0, sin(angle),
        0.0, 1.0, 0.0,
        -sin(angle), 0.0, cos(angle)
    );
}

mat3 rotateX(float angle) {
    return mat3(
        1.0, 0.0, 0.0,
        0.0, cos(angle), -sin(angle),
        0.0, sin(angle), cos(angle)
    );
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
    uv /= u_zoom;  // Apply zoom
    
    vec3 color = vec3(0.0);
    
    float rotationX = u_rotation.x;
    float rotationY = u_rotation.y;
    
    for (float i = 1.0; i <= float(MAX_POINTS); i += 1.0) {
        float t = i / float(MAX_POINTS);
        float angle = 2.0 * PI * PHI * i;
        
        // Calculate point on sphere
        float radius = 1.0;
        float x = radius * sin(t * PI) * cos(angle);
        float y = radius * sin(t * PI) * sin(angle);
        float z = radius * cos(t * PI);
        
        // Apply rotation
        vec3 point3D = rotateY(rotationY) * rotateX(rotationX) * vec3(x, y, z);
        
        // Project 3D point to 2D
        vec2 point = point3D.xy / (point3D.z + 2.0);
        
        // Adjust point size based on z-coordinate (depth) and zoom
        float size = 0.005 * (1.0 + point3D.z) / u_zoom;
        
        // Calculate hue based on position in spiral and time
        float hue = fract(t + u_time * 0.1);
        vec3 pointColor = hsv2rgb(vec3(hue, 0.8, 1.0));
        
        // Apply depth-based shading
        pointColor *= (point3D.z + 1.0) * 0.5;
        
        float intensity = drawPoint(uv, point, size);
        color += pointColor * intensity;
    }
    
    // Add glow effect
    color *= 1.5;
    color = 1.0 - exp(-color);
    
    gl_FragColor = vec4(color, 1.0);
}
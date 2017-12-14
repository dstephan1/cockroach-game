

function roomInit() {
    // ROOM

    var wallTexture = "Assets/wall.png";
    var roomWidth = 100;
    var roomLength = 100;
    var roomHeight = 75;

    // east wall
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(-.5, -.5, 0);
    a.scale = vec3(1, roomHeight, roomLength + 2);
    a.position = vec3(100, 0, 50);
    a.texture = wallTexture;

    // north wall
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(0, -.5, .5);
    a.scale = vec3(roomWidth + 2, roomHeight, 1);
    a.position = vec3(50, 0, -1);
    a.texture = wallTexture;

    // west wall
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(.5, -.5, 0);
    a.scale = vec3(1, roomHeight, roomLength + 2);
    a.position = vec3(-1, 0, 50);
    a.texture = wallTexture;
    //a.color = vec4(1, 1, 1, .5);

    // south wall
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(0, -.5, -.5);
    a.scale = vec3(100, roomHeight, 1);
    a.position = vec3(50, 0, 100);
    a.texture = wallTexture;

    // ground
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(0, .5, 0);
    a.scale = vec3(roomWidth + 2, 1, 100 + 2);
    a.position = vec3(50,0,50);
    a.texture = "Assets/wood.png";

    // ceiling
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(0, 0, 0);
    a.scale = vec3(100, 1, 100);
    a.position = vec3(50, roomHeight, 50);
    a.texture = wallTexture;


    // cabinet
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(0, -.5, -.5);
    a.scale = vec3(35, 60, 30);
    a.position = vec3(60, 0, -.5);
    a.texture = "Assets/desk.png";

    // cabinet
    sceneAdd(a = new Actor(new cube()));
    a.origin = vec3(.5, -.5, -.5);
    a.scale = vec3(20, 20, 80);
    a.position = vec3(100, 0, 0);
    a.texture = "Assets/furniture.png";
}
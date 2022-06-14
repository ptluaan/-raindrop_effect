/**
 * Fragment shader của hạt mưa, được dùng bởi PIXI.js trong một đối tượng EffectCanvas
 * {{uniforms: {time: {type: string, value: number}, iResolution: {type: string, value: [*]}}, fragment: string}}
 */

const alpha = 'https://raw.githubusercontent.com/ptluaan/-raindrop_effect/main/alpha.png';
const shine = 'https://raw.githubusercontent.com/ptluaan/-raindrop_effect/main/shine.png';
const background = 'https://raw.githubusercontent.com/ptluaan/-raindrop_effect/main/background.jpg';
const foreground = 'https://raw.githubusercontent.com/ptluaan/-raindrop_effect/main/foreground.jpg';
// const alpha = 'https://stefanweck.nl/codepen/alpha.png';
// const shine = 'https://stefanweck.nl/codepen/shine.png';
// const background = 'https://stefanweck.nl/codepen/background.jpg';
// const foreground = 'https://stefanweck.nl/codepen/foreground.jpg';

const shaderData = {
  uniforms: {
    iResolution: {
      type: 'v2',
      value: [
      window.innerWidth,
      window.innerHeight] },


    vTextureSize: {
      type: 'v2',
      value: [
      0,
      0] },


    uTextureForeground: {
      type: 'sampler2D',
      value: null },

    uTextureBackground: {
      type: 'sampler2D',
      value: null },

    uTextureDropShine: {
      type: 'sampler2D',
      value: null } },

      


  fragment: `
        precision mediump float;
    
        //Textures
        uniform sampler2D uTextureForeground;
        uniform sampler2D uTextureBackground;
        uniform sampler2D uTextureDropShine;
        
        //Canvas image data
        uniform sampler2D uSampler;
    
        //Độ phân giải và tọa độ của pixel hiện tại
        uniform vec2 iResolution;
        uniform vec2 vTextureSize;
        varying vec2 vTextureCoord;
        
        //Hàm lấy giá trị vec2 của tọa độ hiện tại
        vec2 texCoord(){
            return vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y) / iResolution;
        }

        //Scales bg lên bằng kích thước của container
        vec2 scaledTextureCoordinate(){
            float ratioCanvas = iResolution.x / iResolution.y;
            float ratioImage = vTextureSize.x / vTextureSize.y;
            
            vec2 scale = vec2(1, 1);
            vec2 offset = vec2(0, 0);
            float ratioDelta = ratioCanvas - ratioImage;

            if(ratioDelta >= 0.0){
                scale.y = (1.0 + ratioDelta);
                offset.y = ratioDelta / 2.0;
            }else{
                scale.x = (1.0 - ratioDelta);
                offset.x = -(ratioDelta / 2.0);
            }

            return (texCoord() + offset) / scale;
        }
        
        //Alpha- trộn 2 màu
        vec4 blend(vec4 bg, vec4 fg){
            vec3 bgm = bg.rgb * bg.a;
            vec3 fgm = fg.rgb * fg.a;
            float ia = 1.0 - fg.a;
            float a = (fg.a + bg.a * ia);
            
            vec3 rgb;
            
            if(a != 0.0){
                rgb = (fgm + bgm * ia) / a;
            }else{
                rgb = vec3(0.0,0.0,0.0);
            }
            
            return vec4(rgb,a);
        }
        
        vec2 pixel(){
            return vec2(1.0, 1.0) / iResolution;
        }
        
        //lấy màu từ fg
        vec4 fgColor(){
            return texture2D(uSampler, vTextureCoord);
        }
                
        void main(){
            vec4 bg = texture2D(uTextureBackground, scaledTextureCoordinate());
            vec4 cur = fgColor();

            float d = cur.b; // "thickness"
            float x = cur.g;
            float y = cur.r;
            float a = smoothstep(0.65, 0.7, cur.a);
            
            vec4 smoothstepped = vec4(y, x, d, a);

            vec2 refraction = (vec2(x, y) - 0.5) * 2.0;
            vec2 refractionPos = scaledTextureCoordinate() + (pixel() * refraction * (256.0 + (d * 512.0)));
            vec4 tex = texture2D(uTextureForeground, refractionPos);
            
            float maxShine = 390.0;
            float minShine = maxShine * 0.18;
            vec2 shinePos = vec2(0.5, 0.5) + ((1.0 / 512.0) * refraction) * -(minShine + ((maxShine-minShine) * d));
            vec4 shine = texture2D(uTextureDropShine, shinePos);
            tex = blend(tex,shine);
            
            vec4 fg = vec4(tex.rgb, a);
            gl_FragColor = blend(bg, fg);
        }
	` };


/**
 * Application Class
 * Bootstraps toàn bộ application và khởi tạo các đối tượng */
class Application {
  /**
   * Application constructor
   */
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    // this.loader.defaultQueryString = 'user=me&password=secret';//
    // Xác định nội dung mà PIXI cần tải trước để sử dụng sau này trong application
    this.loader = PIXI.loader.
    add("_alpha",alpha).
    add("_shine",shine).
    add("_background",background).
    add("_foreground",foreground).
    // add("./alpha.png").
    // add("./shine.png").
    // add("./background.jpg").
    // add("./foreground.jpg").
    load(() => this.initialize());
  }

  /**
   * Chạy trình khởi tạo khi trình tải hình ảnh tải xong tất cả các tài nguyên
   * @return void
   */
  initialize() {
    // Tạo đối tượng Stat và append nó vào DOM
    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    // this.stats.domElement.style.left = '100px';
    // this.stats.domElement.style.top = '100px';
    this.stats.domElement.style.left = '0px';
    this.stats.domElement.style.top = '0px';
    this.stats.domElement.style.zIndex = '9000';
    document.body.appendChild(this.stats.domElement);

    // Khởi tạo một instance của EffectCanvas dùng để khởi tạo tất cả hình ảnh
    this.effectCanvas = new EffectCanvas(this.width, this.height, this.loader);

    // Thay đổi kích thước trình nghe cho canvas để lấp đầy cửa sổ trình duyệt một cách tự động
    window.addEventListener('resize', () => this.resizeCanvas(), false);

    //Khởi chạy phương thức initial loop 
    this.loop();
  }

  /**
   * Phương thức thay đổi kích thước đơn giản. Khởi tạo lại mọi thứ trên canvas trong khi thay đổi chiều rộng / chiều cao
   * @return {void}
   */
  resizeCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.effectCanvas.resize(this.width, this.height);
  }

  /**
   * Cập nhật và render application ít nhất 60 lần/giây (60FPS)
   * @return {void}
   */
  loop() {
    window.requestAnimationFrame(() => this.loop());

    this.stats.begin();

    this.effectCanvas.update(this.width, this.height);
    this.effectCanvas.render();

    this.stats.end();
  }}


/**
 * EffectCanvas Class
 */
class EffectCanvas {
  /**
   * EffectCanvas constructor
   */
  constructor(width, height, loader) {
    // Khởi tạo và thiết lập renderer
    this.renderer = new PIXI.autoDetectRenderer(width, height, {
      antialias: false,
      transparent: false });

    this.renderer.autoResize = true;
    document.body.appendChild(this.renderer.view);

    // Khởi tạo một đối tượng container `stage`
    this.stage = new PIXI.Container();

    // Khởi tạo một đối tượng đồ hạo cùng kích cỡ với cửa sổ người dùng
    // Nếu không shader sẽ không lấp đầy toàn bộ màn hình
    this.background = new PIXI.Graphics();
    this.background.fillAlphanumber = 0;
    this.background.beginFill('0xffffff');
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();
    this.background.alpha = 0;
    this.stage.addChild(this.background);

    // Khởi tạo DropletManager
    this.dropletManager = new DropletManager(this.stage, loader);

    // Gửi thông tin về các họa tiết và kích thước của họa tiết nền thông qua uniforms tới shader
    shaderData.uniforms.uTextureDropShine.value = loader.resources["_shine"].texture;
    shaderData.uniforms.uTextureBackground.value = loader.resources["_background"].texture;
    shaderData.uniforms.uTextureForeground.value = loader.resources["_foreground"].texture;
    shaderData.uniforms.vTextureSize.value = [
    loader.resources["_background"].texture.width,
    loader.resources["_background"].texture.height];


    // Tạo bộ lọc Pixi sử dụng shader code tùy chỉnh
    this.dropletShader = new PIXI.Filter('', shaderData.fragment, shaderData.uniforms);

    // Áp dụng vào đối tượng
    this.stage.filters = [this.dropletShader];
  }

  /**
   * Phương thức thay đổi kích thước đơn giản vẽ lại đối tượng đồ họa sao cho lấp đầy toàn bộ màn hình
   * @return {void}
   */
  resize(width, height) {
    this.renderer.resize(width, height);

    this.background.clear();
    this.background.beginFill('0xffffff');
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();
  }

  /**
   *Cập nhật ứng dụng và mọi phần tử con của ứng dụng
   * @return {void}
   */
  update(width, height) {
    this.updateShader(width, height);
    this.dropletManager.update(width, height);
  }

  /**
   * Cập nhật giá trị uniform trong shader
   * @return {void}
   */
  updateShader(width, height) {
    this.dropletShader.uniforms.iResolution = [
    width,
    height];

  }

  /**
   * Kết xuất ứng dụng và mọi phần tử con của ứng dụng
   * @return {void}
   */
  render() {
    this.renderer.render(this.stage);
  }}


/**
 * DropletManager class
 */
class DropletManager {
  /**
   * EffectCanvas constructor
   */
  constructor(stage, loader) {

    /* Giá trị gốc
      smallDropletAmount = 1000;
      largeDropletAmount = 200;
      if (stage.width < 700) {
      smallDropletAmount = 3000;
      largeDropletAmount = 150;
      this.options = {
      spawnRate: {
        small: 0.6,
        large: 0.05 },

      spawnsPerFrame: {
        small: 200,
        large: 5 },

      spawnMass: {
        small: {
          min: 1,
          max: 2 },

        large: {
          min: 7,
          max: 10 } },


      poolDroplets: {
        small: {
          min: smallDropletAmount - 500,
          max: smallDropletAmount },

        large: {
          min: largeDropletAmount - 100,
          max: largeDropletAmount } },


      maximumMassGravity: 17,
      maximumMass: 21,
      dropletGrowSpeed: 1,
      dropletShrinkSpeed: 2,
      dropletContainerSize: 100 };
    
      this.positionMatrix = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]];
    }
    */

    let smallDropletAmount = 1000; //Số giọt nhỏ
    let largeDropletAmount = 200; //Số giọt lớn

    this.options = {
      spawnRate: {
        small: 0.6,
        large: 0.05 }, //Tỷ lệ khởi tạo giọt

      spawnsPerFrame: {
        small: 200, 
        large: 5 }, //Số giọt khởi tạo trên 1 frame

      spawnMass: {
        small: {
          min: 1,
          max: 2 }, 

        large: {
          min: 7,
          max: 10 } }, //Kích thước lúc khởi tạo


      poolDroplets: {
        small: {
          min: smallDropletAmount - 500,
          max: smallDropletAmount }, 

        large: {
          min: largeDropletAmount - 100,
          max: largeDropletAmount } }, //Số giọt tối thiểu và tối đa


      maximumMassGravity: 17, //Độ nặng - tốc độ rơi của giọt
      maximumMass: 21, //Kích thước tối đa
      dropletGrowSpeed: 1, //Tốc độ phát triển cảu giọt
      dropletShrinkSpeed: 2, //Tốc độ co lại của giọt
      dropletContainerSize: 100 }; //Kích thước container


    // Xác định ma trận vị trí để tính toán tất cả các cạnh của giọt trong một vòng lặp
    this.positionMatrix = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]];


    this.smallDroplets = [];
    this.largeDroplets = [];

    this.dropletSmallTexture = loader.resources["_alpha"].texture;
    this.dropletLargeTexture = loader.resources["_alpha"].texture;

    // Tạo một container cho tất cả các giọt
    this.smallDropletContainer = new DropletPool(Droplet, this.dropletSmallTexture, this.options.poolDroplets.small.min, this.options.poolDroplets.small.max);
    this.largeDropletContainer = new DropletPool(LargeDroplet, this.dropletLargeTexture, this.options.poolDroplets.large.min, this.options.poolDroplets.large.max);

    stage.addChild(this.largeDropletContainer);
    stage.addChild(this.smallDropletContainer);
  }

  /**
   * Cập nhật ứng dụng và mọi phần tử con của ứng dụng
   * @return {void}
   */
  update(width, height) {
    DropletManager.removeLargeOffscreenDroplets(width, height, this.largeDroplets, this.largeDropletContainer);

    // Kích hoạt phương thức spawn cho giọt nhỏ
    for (let i = 0; i < this.options.spawnsPerFrame.small; i++) {
      this.spawnNewSmallDroplet(width, height);
    }

    // Kích hoạt phương thức spawn cho giọt lớn
    for (let i = 0; i < this.options.spawnsPerFrame.large; i++) {
      this.spawnNewLargeDroplet(width, height);
    }

    // Kiểm tra xem có cần phải làm gì với giọt lớn không
    // Không kiểm tra giọt nhỏ do giọt nhỏ chỉ đứng yên không di chyển
    this.checkLargeDropletLogic();
  }

  /**
   * Kiểm tra xem giọt lớn có chạm vào giọt nhỏ hơn hay không, nếu có, nó sẽ phát triển bằng một nửa kích thước giọt nhỏ hơn
   * @return {void}
   */
  checkLargeDropletLogic() {
    // Lưu trữ độ dài của mảng để vòng lặp for không phải thực hiện điều đó mỗi lần chạy
    const largeDropletsLength = this.largeDroplets.length;

    for (let i = largeDropletsLength - 1; i >= 0; i--) {
      this.updateLargeDropletSize(this.largeDroplets[i]);
      this.checkDropletMovement(this.largeDroplets[i]);
      this.checkLargeToSmallDropletCollision(this.largeDroplets[i]);
      this.checkLargeToLargeDropletCollision(this.largeDroplets[i]);
      this.removeLargeDroplets(i);
    }
  }

  /**
   * Phương thức kiểm tra xem có nên loại bỏ một giọt lớn hay không
   * @param i - Giọt đang được kiểm tra
   */
  removeLargeDroplets(i) {
    if (this.largeDroplets[i].mass === 0 && this.largeDroplets[i].toBeRemoved === true) {
      this.largeDropletContainer.destroy(this.largeDroplets[i]);
      this.largeDroplets.splice(i, 1);
    }
  }

  /**
   *Phương thức cập nhật kích thước của một giọt lớn
   * @param droplet
   */
  updateLargeDropletSize(droplet) {
    // Nếu một giọt cần được loại bỏ, chúng ta phải thu nhỏ nó xuống 0
    if (droplet.toBeRemoved === true) {
      this.shrinkDropletSize(droplet);
    } else {
      this.growDropletSize(droplet);
    }

    // Cập nhật chiều rộng và chiều cao của giọt dựa trên khối lượng mới của giọt
    droplet.width = droplet.mass * 6;
    droplet.height = droplet.mass * 7;
  }

  /**
   * Thu nhỏ giọt dựa trên tốc độ thu nhỏ đã định cấu hình. Nếu nó quá nhỏ, đặt khối lượng bằng của nó bằng 0
   * @param {LargeDroplet} droplet
   */
  shrinkDropletSize(droplet) {
    if (droplet.mass - this.options.dropletShrinkSpeed <= 0) {
      droplet.mass = 0;
    } else {
      droplet.mass -= this.options.dropletShrinkSpeed;
    }
  }

  /**
   * Phát triển một giọt dựa trên targetMass
   * @param {LargeDroplet} droplet
   */
  growDropletSize(droplet) {
    // Nếu một giọt đã đạt đến khối lượng mục tiêu, kết thúc phương thức
    if (droplet.mass === droplet.targetMass) {
      return;
    }

    // Kiểm tra có thể phát triển giọt dựa trên dropletGrowSpeed
    if (droplet.mass + this.options.dropletGrowSpeed >= droplet.targetMass) {
      droplet.mass = droplet.targetMass;
    } else {
      droplet.mass += this.options.dropletGrowSpeed;
    }
  }

  /**
   * Kiểm tra xem một giọt lớn có nên chuyển động hay không
   * @param {LargeDroplet} droplet
   * @return {void}
   */
  checkDropletMovement(droplet) {
    // Không cần kiểm tra nếu giọt sắp bị loại bỏ ở cuối vòng lặp này
    if (droplet.toBeRemoved === true) {
      return;
    }

    // Kiểm tra xem khối lượng các giọt có đủ cao để di chuyển không và nếu giọt vẫn chưa chuyển động
    if (droplet.mass < this.options.maximumMassGravity && droplet.dropletVelocity.y === 0 && droplet.dropletVelocity.x === 0) {
      // Có một khả năng giọt bắt đầu chuyển động
      // if (true) {
      //   droplet.dropletVelocity.x = Utils.getRandomInt(0.5, 3);
      // }
      if (Math.random() < 0.01) {
        droplet.dropletVelocity.y = Utils.getRandomInt(0.5, 3);
      }
    } else if (droplet.mass < this.options.maximumMassGravity && droplet.dropletVelocity.y !== 0) {
      // Có một khả năng là giọt dịch chuyển sang trái hoặc phải
      if (Math.random() < 0.1) {
        droplet.x += Utils.getRandomInt(-10, 10) / 10;
      }

      // Có khả năng nhỏ là giọt nước sẽ ngừng di chuyển
      if (Math.random() < 0.1) {
        droplet.dropletVelocity.y = 0;
      }
    } else if (droplet.mass >= this.options.maximumMassGravity && droplet.dropletVelocity.y < 10) {
      // Giọt rơi vì nó quá nặng, tốc độ và hướng của nó hiện đã được thiết lập
      droplet.dropletVelocity.y = Utils.getRandomInt(10, 20);
      droplet.dropletVelocity.x = Utils.getRandomInt(-10, 10) / 10;
    }

    // Tính vị trí x và y của giọt dựa trên vận tốc của nó
    droplet.y += droplet.dropletVelocity.y;
    droplet.x += droplet.dropletVelocity.x;
  }

  /**
   * Kiểm tra vị trí của giọt nhỏ trong mảng giọt lớn
   * @param {Droplet} droplet
   */
  getDropletPresenceArray(droplet) {
    //Xác định một tập hợp các chỉ mục mảng mà chúng ta phải kiểm tra xung đột
    const arrayIndexes = [];
    const length = this.positionMatrix.length;

    // Lặp qua positionMatrix để tính vị trí của mọi cạnh của giọt
    for (let i = 0; i < length; i++) {
      const edgePosition = {
        x: Math.floor((droplet.x + droplet.width / 7 * this.positionMatrix[i][0]) / this.options.dropletContainerSize),
        y: Math.floor((droplet.y + droplet.height / 7 * this.positionMatrix[i][1]) / this.options.dropletContainerSize) };


      // Luôn luôn đẩy vị trí đầu tiên trong mảng arrayIndexes
      if (i === 0) {
        arrayIndexes.push(edgePosition);
        continue;
      }

      // Nếu vị trí hiện tại khác với vị trí đầu tiên, hãy lưu trữ giá trị mới vì điều đó có nghĩa rằng đây cũng là một mảng mà chúng ta cần kiểm tra xung đột
      if (arrayIndexes[0].x !== edgePosition.x || arrayIndexes[0].y !== edgePosition.y) {
        arrayIndexes.push(edgePosition);
      }
    }

    return arrayIndexes;
  }

  /**
   * Kiểm tra sự va chạm giữa một giọt lớn và tất cả các giọt khác
   * @param droplet
   */
  checkLargeToLargeDropletCollision(droplet) {
    if (droplet.toBeRemoved === true) {
      return;
    }

    // Lưu trữ độ dài của mảng giọt nước để giá trị đó được lưu trong bộ nhớ cache trong vòng lặp for
    const length = this.largeDroplets.length;

    for (let i = length - 1; i >= 0; i--) {
      if (droplet.x === this.largeDroplets[i].x && droplet.y === this.largeDroplets[i].y) {
        continue;
      }

      // Tính sự khác biệt về vị trí đối với trục hoành và trục tung
      const dx = droplet.x - this.largeDroplets[i].x;
      const dy = droplet.y - this.largeDroplets[i].y;

      // Tính khoảng cách giữa giọt hiện tại và giọt khác
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Nếu khoảng cách giữa các giọt đủ gần, các giọt va chạm sẽ tăng kích thước
      if (distance <= droplet.width / 7 + this.largeDroplets[i].width / 7) {
        if (droplet.mass + this.largeDroplets[i].mass <= this.options.maximumMass) {
          droplet.targetMass = droplet.mass + this.largeDroplets[i].mass;
        } else {
          droplet.targetMass = this.options.maximumMass;
        }

        // Các giọt còn lại nên được loại bỏ ở cuối vòng lặp này
        this.largeDroplets[i].toBeRemoved = true;
      }
    }
  }

  /**
   * Kiểm tra xem một giọt lớn có chạm vào một giọt nhỏ hơn hay không, nếu có, nó sẽ lớn lên bằng một nửa kích thước của các giọt nhỏ hơn
   * @param {LargeDroplet} droplet
   * @return {void}
   */
  checkLargeToSmallDropletCollision(droplet) {
    if (droplet.toBeRemoved === true) {
      return;
    }

    //Xác định một tập hợp các chỉ mục mảng mà chúng ta phải tìm kiếm xung đột qua đó
    const arrayIndexes = this.getDropletPresenceArray(droplet);

    for (let i = 0; i < arrayIndexes.length; i++) {
      //Nếu giọt nhỏ không tồn tại nữa, chúng ta có thể tiếp tục đến giá trị tiếp theo trong vòng lặp
      if (typeof this.smallDroplets[arrayIndexes[i].x] === 'undefined' || typeof this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y] === 'undefined') {
        continue;
      }

      // Lưu trữ chiều dài của mảng để vòng lặp for không phải làm điều đó mỗi lần chạy
      const smallDropletsLength = this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y].length;

      for (let c = smallDropletsLength - 1; c >= 0; c--) {
        // Tính sự khác biệt về vị trí đối với trục hoành và trục tung
        const dx = droplet.x - this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c].x;
        const dy = droplet.y - this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c].y;

        // Tính khoảng cách giữa giọt hiện tại và giọt hiện tại khác
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Nếu khoảng cách đủ nhỏ, chúng ta có thể tăng kích thước của giọt lớn và loại bỏ giọt nhỏ
        if (distance <= droplet.width / 7 + this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c].width / 7) {
          if (droplet.mass + this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c].mass / 3 <= this.options.maximumMass) {
            droplet.targetMass = droplet.mass + this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c].mass / 3;
          }

          // Loại bỏ giọt nhỏ và đặt nó trở lại nhóm đối tượng
          this.smallDropletContainer.destroy(this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y][c]);
          this.smallDroplets[arrayIndexes[i].x][arrayIndexes[i].y].splice(c, 1);
        }
      }
    }
  }

  /**
   * Tạo ra một giọt nhỏ mới trên màn hình dựa trên cơ hội xuất hiện
   * @param {number} width
   * @param {number} height
   * @return {void}
   */
  spawnNewSmallDroplet(width, height) {
    if (Math.random() > this.options.spawnRate.small) {
      return;
    }

    const droplet = this.smallDropletContainer.get();

    //Nếu pool không cho phép tạo thêm nhiều giọt hơn, kết thúc
    if (droplet === null) {
      return;
    }

    const position = {
      x: Utils.getRandomInt(0, width),
      y: Utils.getRandomInt(0, height) };

    const mass = Utils.getRandomInt(this.options.spawnMass.small.min, this.options.spawnMass.small.max);
    const arrayIndex = {
      x: Math.floor(position.x / this.options.dropletContainerSize),
      y: Math.floor(position.y / this.options.dropletContainerSize) };


    // Cập nhật với vị trí và bán kính mới của giọt
    droplet.x = position.x;
    droplet.y = position.y;
    droplet.mass = mass;
    droplet.width = droplet.mass * 8;
    droplet.height = droplet.mass * 8;

    if (typeof this.smallDroplets[arrayIndex.x] === 'undefined') {
      this.smallDroplets[arrayIndex.x] = [];
    }

    if (typeof this.smallDroplets[arrayIndex.x][arrayIndex.y] === 'undefined') {
      this.smallDroplets[arrayIndex.x][arrayIndex.y] = [];
    }

    this.smallDroplets[arrayIndex.x][arrayIndex.y].push(droplet);
  }

  /**
   * Tạo ra một giọt lớn mới trên màn hình dựa trên cơ hội xuất hiện
   * @param {number} width
   * @param {number} height
   * @return {void}
   */
  spawnNewLargeDroplet(width, height) {
    if (Math.random() > this.options.spawnRate.large) {
      return;
    }

    const droplet = this.largeDropletContainer.get();

    if (droplet === null) {
      return;
    }

    // Đảm bảo giọt cập nhật với vị trí và bán kính mới
    const mass = Utils.getRandomInt(this.options.spawnMass.large.min, this.options.spawnMass.large.max);
    droplet.x = Utils.getRandomInt(0, width);
    droplet.y = Utils.getRandomInt(-100, height / 1.5);
    droplet.mass = mass / 2;
    droplet.targetMass = mass;
    droplet.width = droplet.mass * 6;
    droplet.height = droplet.mass * 7;
    droplet.dropletVelocity.x = 0;
    droplet.toBeRemoved = false;

    this.largeDroplets.push(droplet);
  }

  /**
   * Kiểm tra từng giọt để xem nó có nằm ngoài màn hình hay không. Nếu vậy, nó sẽ được đẩy trở lại nhóm đối tượng để được sử dụng lại
   * @param {number} width
   * @param {number} height
   * @param {Array} dropletArray
   * @param {DropletPool} dropletContainer
   * @return {void}
   */
  static removeLargeOffscreenDroplets(width, height, dropletArray, dropletContainer) {
    // Lưu trữ độ dài của mảng để vòng lặp for không phải thực hiện điều đó mỗi lần chạy
    const length = dropletArray.length;

    for (let i = length - 1; i >= 0; i--) {
      if (dropletArray[i].x > width + 10 || dropletArray[i].x < -10 || dropletArray[i].y > height + 10 || dropletArray[i].y < -100) {
        dropletContainer.destroy(dropletArray[i]);
        dropletArray.splice(i, 1);
      }
    }
  }}


/**
 * DropletPool class
 * Các chức năng như một nhóm đối tượng để chúng ta có thể sử dụng lại các giọt nhiều lần
 */
class DropletPool extends PIXI.particles.ParticleContainer {
  /**
   * DropletPool constructor
   */
  constructor(ObjectToCreate, objectTexture, startingSize, maximumSize) {
    super(maximumSize, {
      scale: true,
      position: true,
      rotation: false,
      uvs: false,
      alpha: false });


    this.ObjectToCreate = ObjectToCreate;
    this.objectTexture = objectTexture;
    this.pool = [];
    this.inUse = 0;
    this.startingSize = startingSize;
    this.maximumSize = maximumSize;

    this.initialize();
  }

  /**
   * Khởi tạo lô đối tượng ban đầu mà chúng ta sẽ sử dụng trong toàn bộ ứng dụng
   * @return {void}
   */
  initialize() {
    for (let i = 0; i < this.startingSize; i += 1) {
      const droplet = new this.ObjectToCreate(this.objectTexture);
      droplet.x = -100;
      droplet.y = -100;
      droplet.anchor.set(0.5);

      // Thêm đối tượng vào PIXI Container và lưu trữ nó trong pool
      this.addChild(droplet);
      this.pool.push(droplet);
    }
  }

  /**
   * Lấy một đối tượng từ nhóm đối tượng, kiểm tra xem còn lại một đối tượng hay nó có thể tạo một đối tượng mới nếu không
   * @returns {object}
   */
  get() {
    // Kiểm tra xem chúng ta đã đạt đến số lượng đối tượng tối đa chưa, nếu có, hãy trả về null

    if (this.inUse >= this.maximumSize) {
      return null;
    }

    // Vì chưa đạt đến số lượng đối tượng tối đa, vì vậy ta sử dụng lại một đối tượng
    this.inUse++;

    //Nếu vẫn còn đối tượng trong nhóm, trả lại mục cuối cùng từ nhóm
    if (this.pool.length > 0) {
      return this.pool.pop();
    }

    //Nhóm trống, nhưng vẫn được phép tạo một đối tượng mới và trả về
    const droplet = new this.ObjectToCreate(this.objectTexture);
    droplet.x = -100;
    droplet.y = -100;
    droplet.anchor.set(0.5, 0.5);

    // Thêm đối tượng vào PIXI Container và trả về
    this.addChild(droplet);
    return droplet;
  }

  /**
   * Đặt một phần tử trở lại nhóm đối tượng và đặt lại nó để sử dụng sau này
   * @param element - Đối tượng sẽ được đẩy trở lại nhóm đối tượng để được sử dụng lại sau này
   * @return {void}
   */
  destroy(element) {
    if (this.inUse - 1 < 0) {
      console.error('Something went wrong, you cant remove more elements than there are in the total pool');
      return;
    }

    // Di chuyển đối tượng ra ngoài màn hình
    // @see: https://github.com/pixijs/pixi.js/issues/1910
    element.x = -100;
    element.y = -100;

    // Đẩy phần tử trở lại nhóm đối tượng để nó có thể được sử dụng lại lần nữa
    this.inUse -= 1;
    this.pool.push(element);
  }}


/**
 * Droplet Class
 */
class Droplet extends PIXI.Sprite {
  /**
   * Droplet constructor
   */
  constructor(texture) {
    super(texture);

    this.mass = 0;
  }}

/**
 * LargeDroplet Class
 */
class LargeDroplet extends Droplet {
  /**
   * Droplet constructor
   */
  constructor(texture) {
    super(texture);

    this.dropletVelocity = new PIXI.Point(0, 0);
    this.toBeRemoved = false;
    this.targetMass = 0;
  }}

/**
 * Lớp Utilities có một số chức năng cần thiết trong toàn bộ ứng dụng
 */
class Utils {
  /**
   * Trả về một số nguyên ngẫu nhiên giữa giá trị tối thiểu và giá trị lớn nhất đã cho
   * @param {number} min - 
   * @param {number} max - 
   * @return {number}
   */
  static getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }}

/**
 * Chức năng onload được thực thi bất cứ khi nào trang tải xong hay khởi tạo ứng dụng
 */
window.onload = () => {
  // Tạo một phiên bản mới của ứng dụng
  const application = new Application();
};

const { windowWidth, windowHeight } = wx.getSystemInfoSync();

wx.setPreferredFramesPerSecond(10); // 10足够了,不需要更高的帧率,因为我们主要是在加载资源.
_main_canvas_();

/**
 * 通过 canvas 来绘制,比 webgl 实现节省代码量
 */
function _main_canvas_(){
  const canvas = wx.createCanvas();   // 创建画布
  var ctx = canvas.getContext('2d');  // 获取 canvas

  const bgImage = wx.createImage();       // 背景图片
  const loadingBarBG = wx.createImage();  // 进度条背景图片

  const bgImageLoading = loadImage(bgImage, "first_package_images/first_flash.jpg");
  const loadingBarImageLoading = loadImage(loadingBarBG, "first_package_images/loading_bar.png");

  Promise.all([bgImageLoading, loadingBarImageLoading]).then(function(){

    requestAnimationFrame(loop);
  });

  /**
   * 绘制场景
   */
  function drawScene(){
    // 清除屏幕
    ctx.clearRect(0, 0, windowWidth, windowHeight)
    
    { // 距中显示背景
      // 计算背景的缩放比
      const widthScale = windowWidth/bgImage.width;
      const heightScale = windowHeight/bgImage.height;
      const bgScale = Math.max(widthScale, heightScale);
      const width = bgImage.width*bgScale;
      const height = bgImage.height*bgScale;
      // 绘制背景
      ctx.drawImage(bgImage, (windowWidth - width)*0.5, (windowHeight - height)*0.5, width, height);
    }


  }

  function loop(){
    drawScene();
    requestAnimationFrame(loop);
  } 
}

function loadImage(image, url){
  return new Promise(function(resolve, _){
    image.onload = function(){
      resolve(image);      
    }

    image.src = url;
  });
}

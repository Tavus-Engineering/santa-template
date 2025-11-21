// Centralized asset path constants
export const ASSET_PATHS = {
  videos: {
    background: '/Zu9p__MDRbBybE9UUmFKV_output.mp4',
    intro: '/veed2.mp4',
    loop: '/SANTA_CC_CUT_0011_FIRE_PLACE-ezgif.com-reverse-video (1).mp4',
    northPole: '/north pole.mp4'
  },
  images: {
    poweredBy: '/poweredby.png',
    santa: '/santa2.png',
    elf: '/elf.png',
    learnMore: '/learnmore2.png',
    backgroundPlaceholder: '/processed-image (81).png',
    gameBackground: '/game-background-long.png',
    shortTree: '/short-tree.png',
    midTree: '/mid-tree.png',
    tallTree: '/tall-tree.png',
    elfUp: '/elfup.png',
    elfDown: '/elfdown.png',
    phoneIcon: '/Frame 50.svg',
    footerLogo: '/Frame 2147229103.png'
  },
  icons: {
    mic: '/icons/mic.png',
    video: '/icons/video.png',
    volume: '/icons/volume.svg',
    moodHappy: '/icons/mood-happy.svg',
    moodHappyFill: '/icons/solid-mood-happy.svg',
    moodNeutral: '/icons/mood-neutral.svg',
    moodNeutralFill: '/icons/solid-mood-neutral.svg',
    moodSad: '/icons/mood-sad.svg',
    moodSadFill: '/icons/solid-mood-sad.svg'
  }
}

// Helper function to get all video paths for preloading
export const getAllVideoPaths = () => Object.values(ASSET_PATHS.videos)

// Helper function to get all image paths for preloading
export const getAllImagePaths = () => Object.values(ASSET_PATHS.images)


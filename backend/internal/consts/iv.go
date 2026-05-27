package consts

const (
	IVExpireDuration   = 30 * 60 // 秒，30分钟
	IVRefreshThreshold = 5 * 60  // 秒，超过5分钟无访问则过期
	IVCacheKey         = "security:iv"
	IVCacheKeyPrefix   = "security:iv:"
)

package consts

const (
	// IVExpireDuration IV 缓存有效期（秒），超时后客户端需重新获取
	IVExpireDuration = 30 * 60

	// IVRefreshThreshold 遗留全局 IV 刷新阈值（秒），超过此时间无访问则重新生成
	IVRefreshThreshold = 5 * 60

	// IVCacheKey 遗留全局 IV 的 Redis key，兼容不传 iv_id 的旧客户端
	IVCacheKey = "security:iv"

	// IVCacheKeyPrefix 按 ID 存储 IV 的 Redis key 前缀，完整 key = prefix + uuid
	IVCacheKeyPrefix = "security:iv:"
)

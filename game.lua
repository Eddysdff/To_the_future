-- 使用高效的数据结构
local players = {}

-- 保存进度
function saveProgress(address, progress)
  players[address] = progress
  return "Saved"
end

-- 获取进度
function getProgress(address)
  return players[address] or "No progress"
end

-- 批量保存进度
function saveBatchProgress(batch)
  for address, progress in pairs(batch) do
    players[address] = progress
  end
  return "Batch saved"
end

-- 处理消息
handlers = {
  save = saveProgress,
  get = getProgress,
  saveBatch = saveBatchProgress
}

-- 主函数
function handle(message)
  if handlers[message.action] then
    return handlers[message.action](message.address, message.data)
  else
    return "Invalid action"
  end
end
# OpManager 流量数据解析说明

## 实际数据格式

根据实际 API 返回数据，`listInterfaces` API 返回的流量数据格式为：

```json
{
  "inTraffic": "69.148 M (0.0%)",   // 入站流量值 + 单位 + 利用率（在括号中）
  "outTraffic": "93.811 M (0.0%)",  // 出站流量值 + 单位 + 利用率（在括号中）
  "inSpeed": "0 bps",
  "outSpeed": "0 bps",
  "statusStr": "Trouble",
  "adminStatus": "Up",
  "operStatus": "Up"
}
```

## 解析逻辑

### 流量值解析

**格式**: `"69.148 M (0.0%)"`

**步骤**:
1. 去除括号中的利用率部分: `"69.148 M (0.0%)"` → `"69.148 M"`
2. 提取数值和单位: `"69.148 M"` → value: `69.148`, unit: `M`
3. 转换为 bps (bits per second):
   - `K` / `KB` / `KBPS` → 乘以 1000
   - `M` / `MB` / `MBPS` → 乘以 1,000,000
   - `G` / `GB` / `GBPS` → 乘以 1,000,000,000
   - `T` / `TB` / `TBPS` → 乘以 1,000,000,000,000
   - `BPS` → 保持不变

**示例**:
- `"69.148 M (0.0%)"` → 69,148,000 bps
- `"3.768 K (1.2%)"` → 3,768 bps
- `"10 G (50.5%)"` → 10,000,000,000 bps
- `"0 bps"` → 0 bps

### 利用率解析

**格式**: `"69.148 M (0.0%)"`

**步骤**:
1. 使用正则表达式提取括号中的百分比: `\(([\d.]+)%\)`
2. 提取的数字即为利用率百分比

**示例**:
- `"69.148 M (0.0%)"` → 0.0%
- `"93.811 M (45.2%)"` → 45.2%
- `"10 G (100.0%)"` → 100.0%

### 状态映射

**OpManager 状态** → **内部状态**:
- `"正常"` / `"Clear"` → `"UP"`
- `"问题"` / `"Trouble"` → `"DOWN"`
- `"严重"` / `"Critical"` → `"DOWN"`
- `"停止"` / `"Down"` → `"DOWN"`
- `"Up"` → `"UP"`

## 代码实现

### TypeScript 解析函数

```typescript
// 解析流量字符串（去除括号中的利用率）
const parseTraffic = (trafficStr: string): number => {
  if (!trafficStr || trafficStr.trim() === '' || trafficStr === '0' || trafficStr === '0 bps') {
    return 0;
  }
  
  // 去除利用率部分: "69.148 M (0.0%)" → "69.148 M"
  const trafficOnly = trafficStr.trim().replace(/\s*\([^)]*\)\s*$/, '').trim();
  
  const parts = trafficOnly.split(/\s+/);
  if (parts.length < 2) return 0;
  
  const value = parseFloat(parts[0]);
  if (isNaN(value)) return 0;
  
  const unit = parts[1].toUpperCase();
  
  // 转换为 bps
  let multiplier = 1;
  if (unit === 'K' || unit === 'KB' || unit === 'KBPS') {
    multiplier = 1000;
  } else if (unit === 'M' || unit === 'MB' || unit === 'MBPS') {
    multiplier = 1000 * 1000;
  } else if (unit === 'G' || unit === 'GB' || unit === 'GBPS') {
    multiplier = 1000 * 1000 * 1000;
  } else if (unit === 'T' || unit === 'TB' || unit === 'TBPS') {
    multiplier = 1000 * 1000 * 1000 * 1000;
  } else if (unit === 'BPS') {
    multiplier = 1;
  }
  
  return value * multiplier;
};

// 从流量字符串中提取利用率
const parseUtilizationFromTraffic = (trafficStr: string): number => {
  if (!trafficStr) return 0;
  
  // 提取括号中的百分比: "69.148 M (0.0%)" → 0.0
  const match = trafficStr.match(/\(([\d.]+)%\)/);
  if (match && match[1]) {
    const value = parseFloat(match[1]);
    return isNaN(value) ? 0 : value;
  }
  
  return 0;
};

// 解析利用率（优先从单独字段，否则从流量字符串中提取）
const parseUtilization = (utilStr: string | undefined, trafficStr?: string): number => {
  // 优先从单独字段获取
  if (utilStr) {
    const value = parseFloat(utilStr);
    if (!isNaN(value)) return value;
  }
  
  // 从流量字符串中提取
  if (trafficStr) {
    return parseUtilizationFromTraffic(trafficStr);
  }
  
  return 0;
};
```

## 使用示例

```typescript
const inTrafficStr = "69.148 M (0.0%)";
const outTrafficStr = "93.811 M (45.2%)";

// 解析流量值
const inBandwidth = parseTraffic(inTrafficStr);  // 69148000 bps
const outBandwidth = parseTraffic(outTrafficStr); // 93811000 bps

// 解析利用率
const inUtilization = parseUtilization(undefined, inTrafficStr);   // 0.0
const outUtilization = parseUtilization(undefined, outTrafficStr); // 45.2

// 格式化显示
const formatBandwidth = (bps: number): string => {
  const mbps = bps / (1000 * 1000);
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(1)} G`;
  }
  return `${mbps.toFixed(1)} M`;
};

console.log(formatBandwidth(inBandwidth));   // "69.1 M"
console.log(formatBandwidth(outBandwidth));  // "93.8 M"
console.log(`In: ${inUtilization}%`);        // "In: 0.0%"
console.log(`Out: ${outUtilization}%`);      // "Out: 45.2%"
```

## 测试用例

| 输入 | 流量值 (bps) | 利用率 (%) |
|------|-------------|-----------|
| `"69.148 M (0.0%)"` | 69,148,000 | 0.0 |
| `"93.811 M (45.2%)"` | 93,811,000 | 45.2 |
| `"3.768 K (1.5%)"` | 3,768 | 1.5 |
| `"10 G (100.0%)"` | 10,000,000,000 | 100.0 |
| `"0 bps"` | 0 | 0 |
| `"1.5 M"` | 1,500,000 | 0 (无括号) |
| `""` | 0 | 0 |

## 注意事项

1. **格式兼容性**: 代码同时支持带括号和不带括号的格式
   - 带括号: `"69.148 M (0.0%)"`
   - 不带括号: `"69.148 M"`

2. **单位大小写**: 单位不区分大小写（转换为大写后比较）

3. **边界情况**:
   - 空字符串 → 0
   - `"0"` → 0
   - `"0 bps"` → 0
   - 无效格式 → 0

4. **利用率字段优先级**:
   - 如果存在单独的 `inUtil`/`outUtil` 字段，优先使用
   - 否则从流量字符串的括号中提取

5. **状态映射**: 同时支持中文和英文状态值

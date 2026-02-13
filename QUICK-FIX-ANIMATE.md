# 快速修复 animate 语法错误

## 问题描述

服务器上构建时出现语法错误：
```
./src/components/topology/HierarchicalTopologyViewer.tsx
Error: Expected ',', got '}'
  240 │                   }, {
  241 │                     duration: 600,
  242 │                     }
  243 │                   });
```

## 原因

服务器上的文件在修复时可能出现了格式错误，`duration: 600,` 后面有一个多余的 `}`。

## 快速修复（在服务器上执行）

### 方法 1：使用修复脚本（推荐）

```bash
cd /opt/monitoring-app

# 给脚本添加执行权限
chmod +x scripts/fix-animate-simple.sh

# 运行修复脚本
./scripts/fix-animate-simple.sh

# 重新构建
npm run build
```

### 方法 2：手动修复（如果脚本不可用）

```bash
cd /opt/monitoring-app

# 编辑文件
vi src/components/topology/HierarchicalTopologyViewer.tsx

# 找到第 240-242 行，将：
#                   }, {
#                     duration: 600,
#                     }
#                   });

# 改为：
#                   }, {
#                     duration: 600
#                   });
#                   
#                   // Update label positions after animation completes
#                   setTimeout(() => {
#                     if (sigmaRef.current && graphRef.current) {
#                       updateLabelPositions();
#                     }
#                   }, 650);
```

### 方法 3：使用 sed 命令快速修复

```bash
cd /opt/monitoring-app

# 备份
cp src/components/topology/HierarchicalTopologyViewer.tsx src/components/topology/HierarchicalTopologyViewer.tsx.bak

# 修复1: 移除 duration 后面的逗号
sed -i 's/duration:[[:space:]]*600,[[:space:]]*$/duration: 600/g' src/components/topology/HierarchicalTopologyViewer.tsx

# 修复2: 修复 }, { duration: 600, } 格式
sed -i 's/}, {[[:space:]]*duration:[[:space:]]*600,[[:space:]]*}[[:space:]]*);/}, { duration: 600 });/g' src/components/topology/HierarchicalTopologyViewer.tsx

# 修复3: 如果还有多余的 }
sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}[[:space:]]*$/{
    N
    s/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*}\n[[:space:]]*\}[[:space:]]*);/}, { duration: 600 });/
}' src/components/topology/HierarchicalTopologyViewer.tsx

# 修复4: 添加 setTimeout（如果还没有）
if ! grep -A 10 "duration: 600" src/components/topology/HierarchicalTopologyViewer.tsx | grep -q "setTimeout"; then
    sed -i '/}, {[[:space:]]*duration:[[:space:]]*600[[:space:]]*});/a\
                  \
                  // Update label positions after animation completes\
                  setTimeout(() => {\
                    if (sigmaRef.current && graphRef.current) {\
                      updateLabelPositions();\
                    }\
                  }, 650);' src/components/topology/HierarchicalTopologyViewer.tsx
fi

# 验证修复
echo "验证修复后的代码："
sed -n '236,250p' src/components/topology/HierarchicalTopologyViewer.tsx

# 重新构建
npm run build
```

## 正确的代码格式

修复后，第 236-250 行应该是：

```typescript
sigma.getCamera().animate({
  x: centerX,
  y: adjustedY,
  ratio: ratio,
}, { 
  duration: 600
});

// Update label positions after animation completes
setTimeout(() => {
  if (sigmaRef.current && graphRef.current) {
    updateLabelPositions();
  }
}, 650);
```

## 验证修复

修复后，检查代码：

```bash
# 查看修复后的代码
sed -n '236,250p' src/components/topology/HierarchicalTopologyViewer.tsx

# 应该看到正确的格式，没有多余的逗号和括号
```

## 如果还有问题

如果修复后仍有问题，请检查：

1. 文件是否正确保存
2. 是否有其他位置的 animate 调用也需要修复
3. 运行 `npm run type-check` 查看详细错误信息

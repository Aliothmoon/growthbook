# GrowthBook 界面中文翻译：术语表与规则

翻译对象是 GrowthBook（A/B 实验与功能开关平台）网页界面上的文字。读者是国内的产品、运营和开发人员。

## 规则

1. **用简体中文**，语气简洁、专业，符合中文软件界面习惯；按钮和菜单用动宾短语（"添加指标"、"保存"），不要加"请"。称呼用户统一用"你"，不用"您"。
2. **占位符原样保留**：`{0}`、`{1}` 等必须原样出现在译文里，可以按中文语序调整位置，但不能丢、不能改编号。
3. **不翻译**：产品名和专有名词（GrowthBook、SQL、SDK、API、JSON、CSV、URL、ID、UUID、JavaScript、React、Python、BigQuery、Snowflake、Redshift、Postgres、MySQL、ClickHouse、Mixpanel、Segment、Amplitude、Slack、GitHub、Vercel、Webhook 等）、代码和变量名、环境名（production、staging 这类作为值出现时）、单位缩写（ms、KB）、版本号。
4. **标点**：中文句子用全角标点（，。：？！），但译文里出现英文单词或数字时不必强行改成全角括号；省略号用"…"。原文结尾有冒号、问号、句号的，译文保留对应的中文标点；原文没有的，不要加。
5. **大小写只是英文排版习惯**：Title Case 的标题不代表专有名词，正常翻译。
6. **无法判断或无需翻译的**（纯代码、示例值、人名、已经是中文的），译文填与原文**完全相同**的字符串。
7. **不要解释、不要加注释**，每条只给译文。
8. 原文是**句子片段**时（比如 `of`、`and`、`selected`，或者以空格、标点开头结尾的半句），按片段直译，保持简短，因为它会和前后的动态内容拼在一起显示。

## 术语表

| 英文                                         | 中文                                      |
| -------------------------------------------- | ----------------------------------------- |
| Experiment                                   | 实验                                      |
| A/B Test                                     | A/B 测试                                  |
| Variation / Variant                          | 变体                                      |
| Control                                      | 对照组                                    |
| Treatment                                    | 实验组                                    |
| Feature / Feature Flag                       | 功能开关                                  |
| Flag                                         | 开关                                      |
| Rule / Override Rule                         | 规则 / 覆盖规则                           |
| Rollout / Percentage Rollout                 | 发布 / 按比例发布                         |
| Force Rule                                   | 强制规则                                  |
| Targeting                                    | 定向                                      |
| Attribute                                    | 属性                                      |
| Saved Group                                  | 用户分组                                  |
| Environment                                  | 环境                                      |
| Project                                      | 项目                                      |
| SDK Connection                               | SDK 连接                                  |
| Metric                                       | 指标                                      |
| Fact Table                                   | 事实表                                    |
| Fact Metric                                  | 事实指标                                  |
| Metric Group                                 | 指标组                                    |
| Goal Metric                                  | 目标指标                                  |
| Secondary Metric                             | 次要指标                                  |
| Guardrail Metric                             | 护栏指标                                  |
| Data Source                                  | 数据源                                    |
| Assignment / Exposure                        | 分配 / 曝光                               |
| Experiment Assignment Query                  | 实验分配查询                              |
| Identifier Type                              | 标识类型                                  |
| Dimension                                    | 维度                                      |
| Segment                                      | 细分                                      |
| Analysis                                     | 分析                                      |
| Results                                      | 结果                                      |
| Snapshot                                     | 快照                                      |
| Phase                                        | 阶段                                      |
| Traffic                                      | 流量                                      |
| Coverage                                     | 覆盖率                                    |
| Hash Attribute                               | 哈希属性                                  |
| Sticky Bucketing                             | 粘性分桶                                  |
| Namespace                                    | 命名空间                                  |
| Holdout                                      | 保留组                                    |
| Bandit / Multi-Armed Bandit                  | 多臂老虎机                                |
| Chance to Win                                | 胜率                                      |
| Lift / Percent Change                        | 提升 / 变化百分比                         |
| Confidence Interval                          | 置信区间                                  |
| Credible Interval                            | 可信区间                                  |
| Statistical Significance                     | 统计显著性                                |
| p-value                                      | p 值                                      |
| Bayesian / Frequentist                       | 贝叶斯 / 频率派                           |
| Sequential Testing                           | 序贯检验                                  |
| CUPED                                        | CUPED（不译）                             |
| Sample Ratio Mismatch (SRM)                  | 样本比例不匹配（SRM）                     |
| Power / Power Analysis                       | 统计功效 / 功效分析                       |
| Minimum Detectable Effect (MDE)              | 最小可检测效应（MDE）                     |
| Baseline                                     | 基线                                      |
| Conversion Rate                              | 转化率                                    |
| Denominator / Numerator                      | 分母 / 分子                               |
| Ratio Metric                                 | 比率指标                                  |
| Quantile                                     | 分位数                                    |
| Proportion / Binomial                        | 比例                                      |
| Mean                                         | 均值                                      |
| Revenue                                      | 收入                                      |
| Users                                        | 用户                                      |
| Visual Editor                                | 可视化编辑器                              |
| URL Redirect                                 | URL 重定向                                |
| Draft                                        | 草稿                                      |
| Publish / Published                          | 发布 / 已发布                             |
| Revision                                     | 修订版本                                  |
| Review / Approval                            | 审核 / 审批                               |
| Archive / Archived                           | 归档 / 已归档                             |
| Stale                                        | 过期                                      |
| Owner                                        | 负责人                                    |
| Tag                                          | 标签                                      |
| Organization                                 | 组织                                      |
| Team / Member                                | 团队 / 成员                               |
| Role / Permission                            | 角色 / 权限                               |
| API Key / Secret Key                         | API 密钥 / 密钥                           |
| Settings                                     | 设置                                      |
| Dashboard                                    | 仪表盘                                    |
| Report                                       | 报告                                      |
| Idea                                         | 想法                                      |
| Insight                                      | 洞察                                      |
| Learnings                                    | 经验总结                                  |
| Template                                     | 模板                                      |
| Query                                        | 查询                                      |
| Refresh / Update Results                     | 刷新 / 更新结果                           |
| Audit Log                                    | 审计日志                                  |
| Event                                        | 事件                                      |
| Integration                                  | 集成                                      |
| Billing / Plan                               | 账单 / 套餐                               |
| Upgrade                                      | 升级                                      |
| Enterprise / Pro                             | 企业版 / 专业版                           |
| Learn more                                   | 了解更多                                  |
| View docs                                    | 查看文档                                  |
| Get started                                  | 开始使用                                  |
| Add / Create / Edit / Delete / Duplicate     | 添加 / 创建 / 编辑 / 删除 / 复制          |
| Save / Cancel / Close / Back / Next / Submit | 保存 / 取消 / 关闭 / 返回 / 下一步 / 提交 |
| Enable / Disable / Enabled / Disabled        | 启用 / 停用 / 已启用 / 已停用             |
| Optional / Required                          | 可选 / 必填                               |
| None / All / Any                             | 无 / 全部 / 任意                          |

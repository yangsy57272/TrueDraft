# TrueDraft for Anna — privacy and data processing

Test-candidate policy · 2026-11-15. This covers the separate Anna App, not the standalone desktop product.

## English

**Who can use it.** You must meet Anna's requirement: at least18, or the higher legal age of majority where you live. Parental consent does not replace this requirement. This candidate is for fictional-data testing; it does not invite minors or the upload of minors' essays.

**Saving without AI.** Saving sends your prompt, original draft, saved versions, retention choice and any saved feedback to Anna's own-App, per-user storage. “Save — no AI” does not invoke a model. Storage is hosted by Anna, so saving is not a device-only operation.

**AI review.** After you confirm processing for the current prompt/draft, the App sends a best-effort redacted copy of that prompt and draft, the feedback-language choice, coaching instructions and required response format through Anna to its selected model provider. Names and all sensitive details cannot be reliably detected; remove them yourself. The App does not request chat history, school lists, other apps, contacts, files or microphone/camera access. The exact provider is chosen by Anna/user settings, not guaranteed by TrueDraft.

**Training and retention.** This App has no external TrueDraft backend, advertising tracker or model-training pipeline. Anna's [Terms](https://anna.partners/legal/terms) and [Privacy Policy](https://anna.partners/legal/privacy) promise no training of generative model weights while allowing certain context, operational, security, billing and legal retention. They do not guarantee every provider's zero retention or identical training terms. Check the selected provider's applicable terms. Anna and the provider can process essay text; this candidate is not end-to-end encrypted. Platform at-rest encryption/recovery details remain to be confirmed.

**Versions and expiry.** The selected30/90/365-day TTL applies to the whole essay row, including its saved versions and feedback, and restarts on each save or analysis write. Anna implements expiration/cleanup. Expiry does not prove backup or log erasure. The App keeps at most30 versions and refuses additional versions rather than silently dropping old ones.

**Export and deletion.** Export downloads JSON containing all currently active App essays, saved versions and feedback. It does not include platform logs, expired or deleted records. Protect that file. Delete-one and delete-all remove active App records through Anna APS's documented **soft deletion**. Permanent purge, backup copies, billing/security records, provider copies and Anna-account deletion are not controlled or verified by this App. Contact Anna and the selected provider about their deletion/rights processes. Uninstall alone is not a verified deletion request. The App currently has no import/restore or undo-deletion interface; export before deleting.

**Usage and failures.** Managed calls use your Anna Credits or optional platform BYOK route. The App displays actual token counts only when returned, with no estimated dollar bill. Stopping display, closing a window or timing out may not stop generation or charging. There are no automatic paid retries. An uncertain request may remain blocked until its status is resolved with Anna support.

**Logs.** TrueDraft's App code does not log essay bodies, complete requests or credentials. Anna/provider logging is governed by their terms. The official local developer harness displays raw RPC requests: use fictional data there and do not share its full logs publicly.

For App defects use [TrueDraft issues](https://github.com/yangsy57272/TrueDraft/issues). For Anna or provider data requests, contact those services directly. Unconfirmed education/minor-data arrangements are not exceptions to the published age rule.

## 中文

**使用人群。** 须年满18岁，或居住地更高的法定成年年龄。家长同意不能替代。本候选版用于虚构资料测试，不接受未成年人测试，也不邀请上传未成年人的文书。

**只保存，不分析。** 保存会把题目、原始草稿、历史版本、保留期限和已有反馈发送至 Anna 的用户专属应用存储。“只保存”不会调用模型，但也不是仅保存到本机。

**AI 分析。** 你针对当前题目和草稿确认后，本应用将尽力脱敏的题目、草稿、反馈语言、指导指令和格式要求，经 Anna 发至其选定模型提供方。自动脱敏无法可靠识别所有姓名和敏感内容，请自行删去。本应用不请求聊天历史、选校清单、其他应用、联系人、本机文件、麦克风或摄像头。具体模型由 Anna／用户配置决定。

**训练与留存。** 本应用没有独立的 TrueDraft 外部后端、广告追踪或模型训练流程。Anna 条款承诺不训练生成式模型权重，同时允许部分上下文、运行、安全、计费和法律记录留存；模型提供方的训练及留存条件可能不同，不能承诺统一零留存。Anna 和提供方可以处理文书正文；本候选版不是端到端加密存储，平台静态加密与恢复细节仍需确认。

**版本与期限。** 30／90／365天适用于整篇文书记录，含历史版本和反馈；每次保存或分析写入会重新计时。到期清理由 Anna 执行，不证明备份或日志已清除。最多保存30个版本，达到上限后会拒绝新版本，不会静默删除旧版本。

**导出与删除。** 导出下载 JSON，包含当前可读文书、全部已保存版本和反馈，不含平台日志、已过期或已删除记录。请保护导出文件。单篇或全部删除调用 Anna APS 的软删除；本应用无法验证永久清除、备份、计费安全记录、模型提供方副本，也无法删除 Anna 账号。相关权利申请需分别联系 Anna 和提供方。卸载不等于已删除。本应用暂未提供导入恢复或撤销删除界面，请先导出。

**费用与失败。** 使用 Anna Credits 或平台可选 BYOK。仅展示实际返回的 tokens，不估算美元账单。停止接收、关闭窗口或超时可能无法停止生成和计费；不自动付费重试。不确定状态可能需要先向 Anna 支持确认后才能再次分析。

**日志。** 本应用代码不记录文书正文、完整模型请求或凭据；Anna 和提供方的日志受其条款约束。官方本地开发环境会显示原始请求，因此只能用虚构内容测试，不能公开分享完整日志。

应用问题可提交至项目 issues；Anna 和提供方的数据请求需直接联系对应服务。未确认的教育或未成年资料特殊安排，不构成公开年龄规则的例外。

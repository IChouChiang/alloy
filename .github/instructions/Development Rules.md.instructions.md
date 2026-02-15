---
applyTo: '**'
---
1. for small python scripts, always append a step to "compile" the script to check for syntax errors without running it. Use the command: `python -m py_compile <filename.py>`.
2. avoid too many decorative separators like `print("="*60)` or `print("\n")` for spacing unless explicitly requested for readability.
3. Use Google Style docstrings for all complex functions. Include `Args:`, `Returns:`, and `Raises:` etc.
4. Use the conda environment alloy311.
5. 时刻保持 workspace 的整洁，临时用到的测试通过后要及时删除。
6. 尽量不使用 emojis 。
7. 坚持在单一状态文件 PROJECT_STATUS.md 中更新项目进展，避免创建多个独立的状态文件，同时保持该文件的简洁和易读性。
8. 当项目变得过于复杂和庞大时，给出利于长期开发和维护的建议，适时提醒用户转移到 Codex， Claude Code 或 Gemini CLI 等更适合处理复杂项目的环境中继续开发。
9. for those script would running for a long time, add a progress bar  to show the progress of the script and other concise information. 
10. don't embedded python in conda command. `conda run -n alloy311 python -m alloy.experiments.tune_batch_size` will make the output message not shown in the terminal. Please use `conda run -n alloy311` then  `python -m alloy.experiments.tune_batch_size` instead to make the output message shown in the terminal.
11. 随着复杂度提升，主动提出加强 git 版本管理如 branch 的创建，全局的 Codegen，自动化的测试等，来保证项目的可维护性和可扩展性。
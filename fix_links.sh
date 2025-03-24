#!/bin/bash
find docs/guides -type f -name "*.md" -exec sed -i "" -E "s/\[(.*?)\]\(\.\/civ7-(.*?)\.md\)/[\1](\/guides\/\2.md)/g" {} \;
find docs/guides -type f -name "*.md" -exec sed -i "" -E "s/\[(.*?)\]\(\/guides\/file-paths-reference\.md\)/[\1](\/reference\/file-paths-reference.md)/g" {} \;
find docs/reference -type f -name "*.md" -exec sed -i "" -E "s/\[(.*?)\]\(\.\/modding\/civ7-(.*?)\.md\)/[\1](\/guides\/\2.md)/g" {} \;

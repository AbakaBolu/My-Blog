# 仅用于本地预览（可选）。GitHub Pages 线上构建不需要这个文件。
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "webrick"   # Ruby 3.0+ 本地运行 jekyll serve 需要

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

const path = require('path');
const fs = require('fs');
const util = require('util');

class IncludeReplaceWebpackPlugin {
	constructor(config) {
		this.src = config.src || './src';
		this.dist = config.dist || '.';
		this.data = config.data || {};
	}

	apply(compiler) {
		if (compiler.hooks) { // webpack 4
			compiler.hooks.run.tap('IncludeReplaceWebpackPlugin', compilation => this.compileHook(compilation));
		} else {
			compiler.plugin('compilation', compilation => this.compileHook(compilation));
		}
	}

	_readDir(dir) {
		return util.promisify(fs.readdir)(dir);
	}

	_stat(file) {
		return util.promisify(fs.lstat)(file);
	}

	_readFile(file) {
		return util.promisify(fs.readFile)(file).then(file => file.toString());
	}

	_exists(file) {
		return util.promisify(fs.exists)(file);
	}

	_unlink(file) {
		return util.promisify(fs.unlink)(file);
	}

	async _mkdir(dir) {
		let exists = await this._exists(dir);
		if (!exists) return util.promisify(fs.mkdir)(dir);
	}

	async _writeFile(file, content) {
		await this._mkdir(path.dirname(file));
		return util.promisify(fs.writeFile)(file, content);
	}

	async compileHook(compilation) {
        !compilation ? compilation = this.compilation : this.compilation = compilation;
		const out = path.resolve(compilation.options.output.path, this.dist);
		let files = await this._compile(this.src, out);

		let includedFiles = files.reduce((includes, file) => {
			includes.push(...file.includes);
			return includes;
		}, []);

		let srcFolder = this.src;
		if ((await this._stat(srcFolder)).isFile()) srcFolder = path.dirname(srcFolder);

		for (let file of files.filter(file => !includedFiles.includes(file.input))) {
			await this._writeFile(file.input.replace(srcFolder, out), file.content);
		}
	}

	async _compile(file, out) {
		let stat = await this._stat(file);

		if (stat.isDirectory()) return await this._compileDir(file, out);
		else if (stat.isFile()) return [await this._compileFile(file, this.data)];
		else return [];
	}

	async _compileDir(dir, out) {
		let files = [];
		for (let file of await this._readDir(dir))
			files.push(... await this._compile(path.resolve(dir, file), out));

		return files;
	}

	_parseArguments(args, max = 128) {
		let splittedArgs = args.split(',', max);
		splittedArgs[splittedArgs.length - 1] += args.substr(splittedArgs.join(',').length);

		return splittedArgs.map(item => {
			item = item.trim();

			let firstChar = item[0];
			let lastChar = item[item.length - 1];

			if (firstChar === `'` && lastChar === `'`) return item.substr(1, item.length - 2);
			if (firstChar === `"` && lastChar === `"`) return item.substr(1, item.length - 2);
			if (firstChar === '{' && lastChar === '}') return JSON.parse(item);

			return item;
		});
	}

	async _compileFile(file, context) {
		let content = await this._readFile(file);
		let includes = [];

		let regex = /@@(.*?)\s*\((.*?)\)/g;
		let match;
		while ((match = regex.exec(content)) != null) {
			if (match.index === regex.lastIndex) regex.lastIndex++;

			let [full, method, args] = match;

			let result = full;
			if (method === 'include') {
				let [include, data] = this._parseArguments(args, 2);
				var location = path.resolve(path.dirname(file), include);
				includes.push(location);
				result = (await this._compileFile(location, { ...context, ...data })).content;
			} else if (method === 'show') {
				let [variable] = this._parseArguments(args, 1);

				if (variable in context) {
					var value = context[variable];

					if (typeof value === 'Function') result = await context[variable]();
					else result = context[variable];
				}
			}

			content = content.replace(full, result);
		}

		return {
			input: file,
			includes,
			content
		};
	}
}

module.exports = IncludeReplaceWebpackPlugin;

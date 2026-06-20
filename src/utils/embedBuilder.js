const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

class LeonexEmbed {
  /**
   * Base embed creator
   * @param {Object} options
   * @param {string} [options.title]
   * @param {string} [options.description]
   * @param {string} [options.color]
   * @param {Object} [options.fields]
   * @param {string} [options.thumbnail]
   * @param {string} [options.image]
   * @param {Object} [options.author]
   * @param {Object} [options.footer]
   * @param {boolean} [options.timestamp=true]
   */
  static create({
    title,
    description,
    color,
    fields,
    thumbnail,
    image,
    author,
    footer,
    timestamp = true
  } = {}) {
    const embed = new EmbedBuilder();

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    
    // Set custom color or fall back to primary config color
    const embedColor = color || config.colors.primary;
    embed.setColor(embedColor);

    if (fields && Array.isArray(fields)) {
      embed.addFields(fields);
    }

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);

    if (author) {
      embed.setAuthor({
        name: author.name,
        iconURL: author.iconURL,
        url: author.url
      });
    }

    // Always ensure developer credit footer
    const footerText = footer && footer.text 
      ? `${footer.text} • ${config.credits}` 
      : config.credits;
    
    embed.setFooter({
      text: footerText,
      iconURL: footer && footer.iconURL ? footer.iconURL : undefined
    });

    if (timestamp) {
      embed.setTimestamp();
    }

    return embed;
  }

  static success(title, description, fields = []) {
    return this.create({
      title: `✅ ${title}`,
      description,
      color: config.colors.success,
      fields
    });
  }

  static error(title, description, fields = []) {
    return this.create({
      title: `❌ ${title}`,
      description,
      color: config.colors.danger,
      fields
    });
  }

  static warn(title, description, fields = []) {
    return this.create({
      title: `⚠️ ${title}`,
      description,
      color: config.colors.warning,
      fields
    });
  }

  static info(title, description, fields = []) {
    return this.create({
      title: `ℹ️ ${title}`,
      description,
      color: config.colors.primary,
      fields
    });
  }
}

module.exports = LeonexEmbed;

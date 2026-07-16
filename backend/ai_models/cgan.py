import torch
import torch.nn as nn


CELEBA_TRAITS = [
    "Male",
    "Young",
    "Black_Hair",
    "Brown_Hair",
    "Blond_Hair",
    "High_Cheekbones",
    "Big_Nose",
    "Big_Lips",
]

CELEBA_CONDITION_DIM = len(CELEBA_TRAITS)


def encode_celeba_traits(traits, device=None):
    sex = str(traits.get("sex", "")).strip().lower()
    age_range = str(traits.get("ageRange", "")).strip().lower()
    hair_color = str(traits.get("hairColor", "")).strip().lower()
    cheekbones = str(traits.get("cheekboneShape", "")).strip().lower()
    nose = str(traits.get("noseShape", "")
    ).strip().lower()
    lips = str(traits.get("lipShape", "")).strip().lower()

    values = [
        1.0 if sex == "male" else 0.0,
        1.0 if age_range in {"young", "13-19", "20-24", "25-35"} else 0.0,
        1.0 if hair_color == "black" else 0.0,
        1.0 if hair_color == "brown" else 0.0,
        1.0 if hair_color in {"blond", "blonde"} else 0.0,
        1.0 if "high" in cheekbones else 0.0,
        1.0 if "big" in nose or "broad" in nose else 0.0,
        1.0 if "big" in lips or "full" in lips else 0.0,
    ]

    return torch.tensor(values, dtype=torch.float32, device=device).unsqueeze(0)


class Generator(nn.Module):
    def __init__(self, latent_dim=100, condition_dim=CELEBA_CONDITION_DIM, image_size=64):
        super().__init__()
        if image_size not in {64, 128}:
            raise ValueError("This starter CGAN currently supports image_size=64 or image_size=128.")

        self.latent_dim = latent_dim
        self.condition_dim = condition_dim
        self.image_size = image_size

        self.project = nn.Sequential(
            nn.Linear(latent_dim + condition_dim, 512 * 4 * 4),
            nn.BatchNorm1d(512 * 4 * 4),
            nn.ReLU(True),
        )

        channels = [512, 256, 128, 64]
        if image_size == 128:
            channels.append(32)

        layers = []
        for in_channels, out_channels in zip(channels, channels[1:]):
            layers.extend(
                [
                    nn.ConvTranspose2d(
                        in_channels,
                        out_channels,
                        kernel_size=4,
                        stride=2,
                        padding=1,
                        bias=False,
                    ),
                    nn.BatchNorm2d(out_channels),
                    nn.ReLU(True),
                ]
            )
        layers.extend(
            [
                nn.ConvTranspose2d(channels[-1], 3, kernel_size=4, stride=2, padding=1, bias=False),
                nn.Tanh(),
            ]
        )
        self.model = nn.Sequential(*layers)

    def forward(self, noise, conditions):
        x = torch.cat((noise, conditions), dim=1)
        x = self.project(x).view(x.size(0), 512, 4, 4)
        return self.model(x)


class Discriminator(nn.Module):
    def __init__(self, condition_dim=CELEBA_CONDITION_DIM, image_size=64):
        super().__init__()
        if image_size not in {64, 128}:
            raise ValueError("This starter CGAN currently supports image_size=64 or image_size=128.")

        self.condition_dim = condition_dim
        self.image_size = image_size
        self.condition_map = nn.Linear(condition_dim, image_size * image_size)

        channels = [4, 64, 128, 256, 512]
        if image_size == 128:
            channels.insert(1, 32)

        layers = [
            nn.Conv2d(channels[0], channels[1], kernel_size=4, stride=2, padding=1, bias=False),
            nn.LeakyReLU(0.2, inplace=True),
        ]
        for in_channels, out_channels in zip(channels[1:-1], channels[2:]):
            layers.extend(
                [
                    nn.Conv2d(
                        in_channels,
                        out_channels,
                        kernel_size=4,
                        stride=2,
                        padding=1,
                        bias=False,
                    ),
                    nn.BatchNorm2d(out_channels),
                    nn.LeakyReLU(0.2, inplace=True),
                ]
            )
        layers.append(nn.Conv2d(512, 1, kernel_size=4, stride=1, padding=0, bias=False))
        self.model = nn.Sequential(*layers)

    def forward(self, images, conditions):
        condition_map = self.condition_map(conditions).view(
            conditions.size(0), 1, self.image_size, self.image_size
        )
        x = torch.cat((images, condition_map), dim=1)
        return self.model(x).view(-1, 1)


def weights_init(module):
    name = module.__class__.__name__
    if "Conv" in name:
        nn.init.normal_(module.weight.data, 0.0, 0.02)
    elif "BatchNorm" in name:
        nn.init.normal_(module.weight.data, 1.0, 0.02)
        nn.init.constant_(module.bias.data, 0)

import { AutoEncoderPatchType,PatchableArray, PatchType } from '@simonbackx/simple-encoding';
import { Request } from "@simonbackx/simple-endpoints";
import { Group, GroupGenderType,GroupPatch,GroupPermissions,GroupPrivateSettings,GroupSettings, GroupSettingsPatch,Organization, PermissionLevel,Permissions } from '@stamhoofd/structures';

import { GroupFactory } from '../factories/GroupFactory';
import { OrganizationFactory } from '../factories/OrganizationFactory';
import { UserFactory } from '../factories/UserFactory';
import { Token } from '../models/Token';
import { PatchOrganizationEndpoint } from './PatchOrganizationEndpoint';

describe("Endpoint.PatchOrganization", () => {
    // Test endpoint
    const endpoint = new PatchOrganizationEndpoint();

    test("Change the name of the organization", async () => {
        const organization = await new OrganizationFactory({}).create()
        const user = await new UserFactory({ organization, permissions: Permissions.create({ level: PermissionLevel.Full }) }).create()
        //const groups = await new GroupFactory({ organization }).createMultiple(2)
        const token = await Token.createToken(user)

        const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
            id: organization.id,
            name: "My crazy name"
        });
        r.headers.authorization = "Bearer "+token.accessToken

        const response = await endpoint.test(r);
        expect(response.body).toBeDefined();

        if (!(response.body instanceof Organization)) {
            throw new Error("Expected Organization")
        }

        expect(response.body.id).toEqual(organization.id)
        expect(response.body.name).toEqual("My crazy name")
    });

    test("Can't change organization as a normal user", async () => {
        const organization = await new OrganizationFactory({}).create()
        const user = await new UserFactory({ organization }).create()
        const token = await Token.createToken(user)

        const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
            id: organization.id,
            name: "My crazy name"
        });
        r.headers.authorization = "Bearer " + token.accessToken

        await expect(endpoint.test(r)).rejects.toThrow(/permissions/i);
    });

    test("Can't change organization as a user with read access", async () => {
        const organization = await new OrganizationFactory({}).create()
        const user = await new UserFactory({ organization, permissions: Permissions.create({ level: PermissionLevel.Read }) }).create()
        const token = await Token.createToken(user)

        const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
            id: organization.id,
            name: "My crazy name"
        });
        r.headers.authorization = "Bearer " + token.accessToken

        await expect(endpoint.test(r)).rejects.toThrow(/permissions/i);
    });

    test("Change the name of a group with access", async () => {
        const organization = await new OrganizationFactory({}).create()
        const groups = await new GroupFactory({ organization }).createMultiple(2)

        const validPermissions = [
            Permissions.create({
                level: PermissionLevel.Read,
                groups: [
                    GroupPermissions.create({
                        groupId: groups[0].id,
                        level: PermissionLevel.Full
                    })
                ]
            }),
            Permissions.create({
                level: PermissionLevel.Write,
                groups: [
                    GroupPermissions.create({
                        groupId: groups[1].id,
                        level: PermissionLevel.Read
                    }),
                    GroupPermissions.create({
                        groupId: groups[0].id,
                        level: PermissionLevel.Full
                    })
                ]
            }),
            Permissions.create({
                level: PermissionLevel.Full
            }),
        ]

        for (const permission of validPermissions) {
            const user = await new UserFactory({ organization, 
                permissions: permission
            }).create()
            const token = await Token.createToken(user)

            const changes = new PatchableArray<string, Group, AutoEncoderPatchType<Group>>()
            changes.addPatch(GroupPatch.create({
                id: groups[0].id,
                settings: GroupSettingsPatch.create({
                    name: "My crazy group name",
                })
            }))

            const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
                id: organization.id,
                groups: changes.encode({ version: 2 }),
            });
            r.headers.authorization = "Bearer " + token.accessToken

            const response = await endpoint.test(r);
            expect(response.body).toBeDefined();

            if (!(response.body instanceof Organization)) {
                throw new Error("Expected Organization")
            }

            expect(response.body.id).toEqual(organization.id)
            expect(response.body.groups.find(g => g.id == groups[0].id)!.settings.name).toEqual("My crazy group name")
        }
    });

    test("Can't change name of group without access", async () => {
        const organization = await new OrganizationFactory({}).create()
        const groups = await new GroupFactory({ organization }).createMultiple(2)

        const invalidPermissions = [
            Permissions.create({
                level: PermissionLevel.Read,
                groups: [
                    GroupPermissions.create({
                        groupId: groups[0].id,
                        level: PermissionLevel.Write
                    })
                ]
            }),
            Permissions.create({
                level: PermissionLevel.Read,
                groups: [
                    GroupPermissions.create({
                        groupId: groups[0].id,
                        level: PermissionLevel.Read
                    })
                ]
            }),
            Permissions.create({
                level: PermissionLevel.Write
            }),
            Permissions.create({
                level: PermissionLevel.Read
            }),
            null
        ]

        for (const permission of invalidPermissions) {
            const user = await new UserFactory({
                    organization,
                    permissions: permission
            }).create()
                const token = await Token.createToken(user)

                const changes = new PatchableArray<string, Group, AutoEncoderPatchType<Group>>()
                changes.addPatch(GroupPatch.create({
                    id: groups[0].id,
                    settings: GroupSettingsPatch.create({
                        name: "My crazy group name",
                    })
                }))
                const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
                    id: organization.id,
                    groups: changes.encode({ version: 2 }),
                });
                r.headers.authorization = "Bearer " + token.accessToken
                await expect(endpoint.test(r)).rejects.toThrow(/permissions/i);
        }
        
        
    });


    test("Create a group with access", async () => {
        const organization = await new OrganizationFactory({}).create()
        const groups = await new GroupFactory({ organization }).createMultiple(2)

        const validPermissions = [
            Permissions.create({
                level: PermissionLevel.Full
            }),
        ]

        const invalidPermissions = [
            Permissions.create({
                level: PermissionLevel.Write
            }),
        ]

        for (const permission of validPermissions) {
            const user = await new UserFactory({
                organization,
                permissions: permission
            }).create()
            const token = await Token.createToken(user)

            const changes = new PatchableArray<string, Group, AutoEncoderPatchType<Group>>()
            const put = Group.create({
                cycle: 0,
                settings: GroupSettings.create({
                    name: "My crazy group name",
                    startDate: new Date(),
                    endDate: new Date(),
                    genderType: GroupGenderType.Mixed,
                }),
                privateSettings: GroupPrivateSettings.create({})
            })
            changes.addPut(put)

            const r = Request.buildJson("PATCH", "/v3/organization", organization.getApiHost(), {
                id: organization.id,
                groups: changes.encode({ version: 3 }),
            });
            r.headers.authorization = "Bearer " + token.accessToken

            const response = await endpoint.test(r);
            expect(response.body).toBeDefined();

            if (!(response.body instanceof Organization)) {
                throw new Error("Expected Organization")
            }

            expect(response.body.id).toEqual(organization.id)
            expect(response.body.groups).toContainEqual(put)
        }

        for (const permission of invalidPermissions) {
            const user = await new UserFactory({
                organization,
                permissions: permission
            }).create()
            const token = await Token.createToken(user)

            const changes = new PatchableArray<string, Group, AutoEncoderPatchType<Group>>()
            const put = Group.create({
                cycle: 0,
                settings: GroupSettings.create({
                    name: "My crazy group name",
                    startDate: new Date(),
                    endDate: new Date(),
                    genderType: GroupGenderType.Mixed,
                })
            })
            changes.addPut(put)

            const r = Request.buildJson("PATCH", "/v2/organization", organization.getApiHost(), {
                id: organization.id,
                groups: changes.encode({ version: 2 }),
            });
            r.headers.authorization = "Bearer " + token.accessToken
            await expect(endpoint.test(r)).rejects.toThrow(/permissions/i);
        }
    });

});
